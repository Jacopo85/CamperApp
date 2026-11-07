import {before, after, test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, onSnapshot} from 'firebase/firestore';

let env;
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const future = () => Timestamp.fromMillis(Date.now() + 7 * 86400000);
const dbFor = uid => env.authenticatedContext(uid, {email: uid + '@example.com'}).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-camperapp-security',
    firestore: {rules, host: '127.0.0.1', port: 8080}
  });
});
after(async () => { if (env) await env.cleanup(); });

async function seedGroup(gid, owner='owner') {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'groups', gid), {
      name: 'Camper', ownerUid: owner, createdAt: Timestamp.now()
    });
    await setDoc(doc(db, 'groups', gid, 'members', owner), {
      uid: owner, email: owner + '@example.com', role: 'owner', joinedAt: Timestamp.now()
    });
  });
}

test('proprietario puo creare gruppo, membership e profilo', async () => {
  const db = dbFor('owner');
  const gid = 'creation-test';
  await assertSucceeds(setDoc(doc(db, 'groups', gid), {
    name: 'Camper', ownerUid: 'owner', createdAt: serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(db, 'groups', gid, 'members', 'owner'), {
    uid: 'owner', email: 'owner@example.com', role: 'owner', joinedAt: serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(db, 'users', 'owner'), {
    email: 'owner@example.com', groupId: gid, updatedAt: serverTimestamp()
  }));
});

test('non membro non legge il gruppo e non scrive lista spesa', async () => {
  await seedGroup('isolated-group');
  const stranger = dbFor('stranger');
  await assertFails(getDoc(doc(stranger, 'groups', 'isolated-group')));
  await assertFails(setDoc(doc(stranger, 'groups', 'isolated-group', 'shopping', 'x'), {name: 'test'}));
});

test('invito sicuro: solo proprietario e scadenza verificata', async () => {
  await seedGroup('invitation-group');
  const owner = dbFor('owner');
  const stranger = dbFor('stranger');
  const code = 'ABCDEFGHJKLMNPQR';
  await assertSucceeds(setDoc(doc(owner, 'invites', code), {
    groupId: 'invitation-group', createdBy: 'owner', createdAt: serverTimestamp(), expiresAt: future()
  }));
  await assertFails(setDoc(doc(stranger, 'invites', 'BCDEFGHJKLMNPQRS'), {
    groupId: 'invitation-group', createdBy: 'stranger', createdAt: serverTimestamp(), expiresAt: future()
  }));
  await assertFails(setDoc(doc(owner, 'invites', 'OLD12CHARABC'), {
    groupId: 'invitation-group', createdBy: 'owner', createdAt: serverTimestamp(), expiresAt: future()
  }));
  const member = dbFor('member');
  await assertSucceeds(setDoc(doc(member, 'groups', 'invitation-group', 'members', 'member'), {
    uid: 'member', email: 'member@example.com', role: 'member', inviteCode: code, joinedAt: serverTimestamp()
  }));
  await assertSucceeds(getDoc(doc(member, 'groups', 'invitation-group')));
  await assertSucceeds(setDoc(doc(member, 'users', 'member'), {
    email: 'member@example.com', groupId: 'invitation-group', updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(member, 'groups', 'invitation-group', 'members', 'member'), {role: 'owner'}));
  await assertFails(updateDoc(doc(member, 'groups', 'invitation-group'), {ownerUid: 'member'}));
});

test('invito scaduto e profilo con gruppo arbitrario rifiutati', async () => {
  await seedGroup('expired-group');
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'invites', 'QRSTUVWX23456789'), {
      groupId: 'expired-group', createdBy: 'owner', createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() - 60000)
    });
  });
  const member = dbFor('late');
  await assertFails(setDoc(doc(member, 'groups', 'expired-group', 'members', 'late'), {
    uid: 'late', email: 'late@example.com', role: 'member',
    inviteCode: 'QRSTUVWX23456789', joinedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(member, 'users', 'late'), {
    email: 'late@example.com', groupId: 'expired-group', updatedAt: serverTimestamp()
  }));
});

test('utente anonimo non accede agli inviti', async () => {
  const anonymous = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymous, 'invites', 'ABCDEFGHJKLMNPQR')));
});


test('due account vedono aggiornamenti condivisi di spesa e mete', async () => {
  const gid = 'shared-sync-group';
  await seedGroup(gid);
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'groups', gid, 'members', 'member'), {
      uid: 'member', email: 'member@example.com', role: 'member',
      inviteCode: 'ABCDEFGHJKLMNPQR', joinedAt: Timestamp.now()
    });
  });
  const owner = dbFor('owner');
  const member = dbFor('member');
  const ownerItem = doc(owner, 'groups', gid, 'shopping', 'bread');
  const memberItem = doc(member, 'groups', gid, 'shopping', 'bread');
  await assertSucceeds(setDoc(ownerItem, {
    name: 'Pane', checked: false, createdAt: serverTimestamp(), createdBy: 'owner'
  }));
  const sawUpdate = new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('La sincronizzazione non ha notificato la modifica entro 15 secondi'));
    }, 15000);
    unsubscribe = onSnapshot(ownerItem, snapshot => {
      if (snapshot.data()?.checked === true) {
        clearTimeout(timer);
        unsubscribe();
        resolve(true);
      }
    }, error => {
      clearTimeout(timer);
      unsubscribe();
      reject(error);
    });
  });
  await assertSucceeds(updateDoc(memberItem, {checked: true}));
  await sawUpdate;
  await assertSucceeds(setDoc(doc(member, 'groups', gid, 'wishlist', 'lake'), {
    name: 'Lago', createdAt: serverTimestamp(), createdBy: 'member'
  }));
  const lake = await assertSucceeds(getDoc(doc(owner, 'groups', gid, 'wishlist', 'lake')));
  assert.equal(lake.data().name, 'Lago');
});

test('membership falsa, email falsa e invito per gruppo sbagliato sono rifiutati', async () => {
  await seedGroup('group-a');
  await seedGroup('group-b');
  const owner = dbFor('owner');
  const member = dbFor('member');
  const code = 'BCDEFGHJKLMNPQRS';
  await assertSucceeds(setDoc(doc(owner, 'invites', code), {
    groupId: 'group-a', createdBy: 'owner', createdAt: serverTimestamp(), expiresAt: future()
  }));
  await assertFails(setDoc(doc(member, 'groups', 'group-a', 'members', 'member'), {
    uid: 'member', email: 'member@example.com', role: 'owner', joinedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(member, 'groups', 'group-a', 'members', 'member'), {
    uid: 'member', email: 'other@example.com', role: 'member',
    inviteCode: code, joinedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(member, 'groups', 'group-b', 'members', 'member'), {
    uid: 'member', email: 'member@example.com', role: 'member',
    inviteCode: code, joinedAt: serverTimestamp()
  }));
});

test('membro puo cambiare nome gruppo ma non proprietario o membership', async () => {
  await seedGroup('rename-group');
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'groups', 'rename-group', 'members', 'member'), {
      uid: 'member', email: 'member@example.com', role: 'member',
      inviteCode: 'ABCDEFGHJKLMNPQR', joinedAt: Timestamp.now()
    });
  });
  const member = dbFor('member');
  await assertSucceeds(updateDoc(doc(member, 'groups', 'rename-group'), {name: 'Nuovo nome'}));
  await assertFails(updateDoc(doc(member, 'groups', 'rename-group'), {ownerUid: 'member'}));
  await assertFails(updateDoc(doc(member, 'groups', 'rename-group', 'members', 'member'), {email: 'other@example.com'}));
});
