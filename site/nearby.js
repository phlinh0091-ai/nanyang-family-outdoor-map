/* Coordinates supplied by AMap are GCJ-02; all distance inputs use that system. */
(function(root){
  function distance(a,b){const rad=Math.PI/180;const dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));}
  function select(places,origin,radius,query=''){return places.filter(p=>p.mapMatch&&Number.isFinite(p.mapMatch.lng)&&Number.isFinite(p.mapMatch.lat)&&p.name.includes(query)).map(p=>({...p,distance:origin?distance(origin,p.mapMatch):null})).filter(p=>!origin||!radius||p.distance<=radius).sort((a,b)=>(a.distance??0)-(b.distance??0));}
  const api={distance,select};if(typeof module!=='undefined')module.exports=api;else root.Nearby=api;
})(typeof window==='undefined'?{}:window);
