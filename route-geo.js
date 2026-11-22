// Calcoli geografici puri e offline: distanze in linea d'aria, NON stradali.
export function gpsPoint(place){
  if(!place || place.latitude===null || place.longitude===null ||
    place.latitude==="" || place.longitude==="" ||
    place.latitude===undefined || place.longitude===undefined)return null;
  const latitude=Number(place.latitude),longitude=Number(place.longitude);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||
     latitude < -90||latitude > 90||longitude < -180||longitude > 180)return null;
  return {latitude,longitude};
}
export function gpsDistanceKm(a,b){
  const p=gpsPoint(a),q=gpsPoint(b);
  if(!p||!q)return null;
  const radians=value=>value*Math.PI/180;
  const lat=radians(q.latitude-p.latitude),lon=radians(q.longitude-p.longitude);
  const h=Math.sin(lat/2)**2+Math.cos(radians(p.latitude))*Math.cos(radians(q.latitude))*Math.sin(lon/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
// Ordine approssimativo a partire dall'origine (se ha coordinate), altrimenti
// dalla prima meta GPS. Mete senza coordinate restano nella lista, in fondo.
export function arrangeByAirDistance(places,origin=null){
  const geocoded=places.filter(place=>gpsPoint(place)),unknown=places.filter(place=>!gpsPoint(place));
  if(geocoded.length<2)return [...places];
  const pending=[...geocoded],ordered=[];
  let current=gpsPoint(origin);
  if(!current){ordered.push(pending.shift());current=gpsPoint(ordered[0]);}
  while(pending.length){
    let best=0,smallest=Infinity;
    for(let i=0;i<pending.length;i++){
      const distance=gpsDistanceKm(current,pending[i]);
      if(distance!==null&&distance<smallest){smallest=distance;best=i;}
    }
    const next=pending.splice(best,1)[0];
    ordered.push(next);current=gpsPoint(next);
  }
  return [...ordered,...unknown];
}
export function gpsOrigin(text){
  const m=String(text||"").trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  return m?gpsPoint({latitude:Number(m[1]),longitude:Number(m[2])}):null;
}
