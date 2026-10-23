const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let places=[],origin=null,mapUI=null,picking=false,ready=false,originLabel='我的位置';
const navigation=p=>'https://uri.amap.com/marker?'+new URLSearchParams({position:`${p.mapMatch.lng},${p.mapMatch.lat}`,name:p.name,coordinate:'gaode',callnative:'1',src:'nanyang-family'});
function wgs84ToGcj02(longitude,latitude){
 const lng=Number(longitude),lat=Number(latitude);
 if(!Number.isFinite(lng)||!Number.isFinite(lat))throw new Error('Invalid device coordinates');
 if(lng<72.004||lng>137.8347||lat<0.8293||lat>55.8271)return{lng,lat};
 const pi=Math.PI,axis=6378245.0,eccentricity=0.00669342162296594323;
 const transformLat=(x,y)=>{
  let value=-100+2*x+3*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
  value+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;
  value+=(20*Math.sin(y*pi)+40*Math.sin(y/3*pi))*2/3;
  value+=(160*Math.sin(y/12*pi)+320*Math.sin(y*pi/30))*2/3;
  return value;
 };
 const transformLng=(x,y)=>{
  let value=300+x+2*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
  value+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;
  value+=(20*Math.sin(x*pi)+40*Math.sin(x/3*pi))*2/3;
  value+=(150*Math.sin(x/12*pi)+300*Math.sin(x/30*pi))*2/3;
  return value;
 };
 let dLat=transformLat(lng-105,lat-35),dLng=transformLng(lng-105,lat-35);
 const radLat=lat/180*pi,sinLat=Math.sin(radLat),magic=1-eccentricity*sinLat*sinLat,sqrtMagic=Math.sqrt(magic);
 dLat=dLat*180/((axis*(1-eccentricity)/(magic*sqrtMagic))*pi);
 dLng=dLng*180/(axis/sqrtMagic*Math.cos(radLat)*pi);
 return{lng:lng+dLng,lat:lat+dLat};
}
function visible(){return !origin?[]:Nearby.select(places,origin,Number($('#radius').value),$('#query').value.trim());}
function rows(list){const result=list.map(p=>({name:p.name,coordinates:`${p.mapMatch.lng},${p.mapMatch.lat}`,description:`${p.mapMatch.address}\n${p.fee}\n${p.description}`,photos:p.photos,categories:['户外游玩'],url:navigation(p),urlLabel:'去这里 · 手机导航'}));return result;}
function openPlace(name){const p=visible().find(p=>p.name===name);if(!p)return;$('#detail-body').innerHTML=`<article><h3>${esc(p.name)}</h3><p>${esc(p.mapMatch.address)}</p><p>直线 ${p.distance.toFixed(1)} 公里</p><div class="photos">${p.photos.slice(0,8).map(u=>`<a href="${esc(u)}" target="_blank" rel="noreferrer"><img src="${esc(u)}" referrerpolicy="no-referrer" alt="${esc(p.name)}环境照片"></a>`).join('')}</div><p>${esc(p.fee)}</p><details><summary>玩法与博主描述</summary><pre>${esc(p.description)}</pre>${p.sources.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noreferrer">原笔记${i+1}</a>`).join(' · ')}</details><p><a class="nav" href="${esc(navigation(p))}" target="_blank" rel="noopener">在高德打开此地点</a></p><small>打开地点后，可在高德选择“到这里”开始导航。</small></article>`;$('#detail').showModal();}
function render(){const list=visible();$('#count').textContent=origin?`附近 ${list.length} 个项目 · 点击查看详情`:'定位后查看附近项目';$('#list').innerHTML=!origin?'<p>请先定位。取得位置前不展示全城地点。</p>':list.length?list.map(p=>`<button class="place-item" data-place="${esc(p.name)}"><strong>${esc(p.name)}</strong><span>直线 ${p.distance.toFixed(1)} 公里 · 查看详情 →</span></button>`).join(''):'<p>当前范围没有已收录项目，可扩大范围。</p>';if(mapUI){mapUI.update(rows(list));if(origin){mapUI.setOrigin([origin.lng,origin.lat],originLabel);mapUI.center([origin.lng,origin.lat],Number($('#radius').value)===3?14:12);}}}
function setOrigin(point,label){origin=point;originLabel=label==='地图选定的出发位置'?'选定的出发点':'我的位置';picking=false;$('#pick').textContent='地图上选出发位置';$('#origin').textContent=label;render();$('#status').textContent='已按出发位置筛选和排序；直线距离不等于行车距离。';}
function locate(){
 if(!ready)return;
 const button=$('#locate'),status=$('#status');
 button.disabled=true;
 status.textContent='正在请求设备位置…';
 let settled=false,fallbackStarted=false,browserTimer=0,amapTimer=0;
 const clearTimers=()=>{clearTimeout(browserTimer);clearTimeout(amapTimer);};
 const finish=()=>{if(settled)return false;settled=true;clearTimers();button.disabled=false;return true;};
 const fail=message=>{if(!finish())return;status.textContent=message;};
 const succeed=(point,label,message)=>{if(!finish())return;setOrigin(point,label);status.textContent=message;};
 const amapFallback=reason=>{
  if(settled||fallbackStarted)return;
  fallbackStarted=true;
  clearTimeout(browserTimer);
  status.textContent='手机定位暂不可用，正在尝试高德定位…';
  amapTimer=setTimeout(()=>fail('定位等待超时，请检查网站定位权限和系统定位服务后重试。'+(reason?' 定位提示：'+reason:'')),10000);
  try{
   AMap.plugin('AMap.Geolocation',()=>{
    if(settled)return;
    try{
     const geolocation=new AMap.Geolocation({enableHighAccuracy:true,timeout:9000,convert:true,noIpLocate:2});
     geolocation.getCurrentPosition((state,r)=>{
      if(settled)return;
      if(state==='complete'&&r?.position){
       const message=r.accuracy?'定位成功，估算误差约 '+Math.round(r.accuracy)+' 米。':(r.location_type||'定位成功')+'；服务未提供精度数据，位置可能有偏差。';
       succeed({lng:r.position.lng,lat:r.position.lat},'我的当前位置',message);
      }else fail('手机与高德都未能返回位置，请检查系统定位服务。'+(reason?' 定位提示：'+reason:''));
     });
    }catch(error){fail('高德定位启动失败，请检查网络后重试。');}
   });
  }catch(error){fail('定位服务启动失败，请检查网络和系统定位设置。');}
 };
 if(!navigator.geolocation){amapFallback('当前浏览器未提供设备定位接口');return;}
 browserTimer=setTimeout(()=>amapFallback('手机定位等待超时'),12000);
 try{
  navigator.geolocation.getCurrentPosition(pos=>{
   if(settled)return;
   clearTimeout(browserTimer);
   try{
    const point=wgs84ToGcj02(pos.coords.longitude,pos.coords.latitude);
    const accuracy=pos.coords.accuracy;
    const message=Number.isFinite(accuracy)&&accuracy>0?'设备定位成功，估算误差约 '+Math.round(accuracy)+' 米。':'设备定位成功，已转换为地图坐标。';
    succeed(point,'设备当前位置',message);
   }catch(error){fail('设备位置已取得，但本地坐标处理失败，请重试。');}
  },error=>{
   if(settled)return;
   clearTimeout(browserTimer);
   if(error?.code===1){fail('位置权限被拒绝，请在浏览器和系统设置中允许此网站定位。');return;}
   const messages={2:'设备未能提供位置',3:'手机定位超时'};
   amapFallback(messages[error?.code]||'手机定位失败');
  },{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
 }catch(error){amapFallback('手机定位启动失败');}
}
$('#locate').onclick=locate;$('#pick').onclick=()=>{if(!ready)return;picking=!picking;$('#pick').textContent=picking?'请点击地图上的出发位置':'地图上选出发位置';$('#status').textContent=picking?'点击地图空白处设置出发位置。':'已取消选择。';};$('#radius').onchange=render;$('#query').oninput=render;$('#list').onclick=e=>{const b=e.target.closest('[data-place]');if(b)openPlace(b.dataset.place);};$('#close-detail').onclick=()=>$('#detail').close();document.addEventListener('footprint-select',e=>openPlace(e.detail.name));
(async()=>{places=await(await fetch('places.json',{cache:'no-store'})).json();render();const config=window.NANYANG_MAP_CONFIG||{},key=config.amapKey||localStorage.getItem('amapKey')||'',serviceHost=config.serviceHost||localStorage.getItem('amapServiceHost')||'';if(!key||!serviceHost){$('#status').textContent='地图服务尚未配置：需要受域名限制的高德 JS API Key 和服务端代理地址；不要把 securityJsCode 填进网页。';return;}window._AMapSecurityConfig={serviceHost};const script=document.createElement('script');script.src='https://webapi.amap.com/maps?'+new URLSearchParams({v:'2.0',key});await new Promise((ok,no)=>{script.onload=ok;script.onerror=no;document.head.append(script)});const el=document.createElement('div');el.className='footprint-map';el.dataset.detailMode='external';const data=rows(visible());if(!data.length)data.push({name:'南阳浏览中心',coordinates:'112.5283,32.9908'});const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));el.dataset.json=url;el.dataset.amapKey=key;$('#map').replaceChildren(el);mapUI=await FootprintMap.bootstrapMap(el);URL.revokeObjectURL(url);if(!mapUI)throw Error('map');mapUI.onPick(p=>{if(picking)setOrigin(p,'地图选定的出发位置')});mapUI.update([]);mapUI.center([112.56,33.0],12);ready=true;$('#status').textContent=`地图已就绪：已收录 ${places.length} 条材料，其中 ${places.filter(p=>p.mapMatch).length} 个地点可在地图浏览。点击“定位我，找附近”后才会请求设备位置。`;})().catch(error=>{console.error(error.message);$('#status').textContent='地图服务加载失败，地点材料仍可查看，请检查网络或地图配置。'});
