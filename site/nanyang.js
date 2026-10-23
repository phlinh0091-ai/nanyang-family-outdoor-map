const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let places=[],origin=null,mapUI=null,picking=false,ready=false,originLabel='我的位置';
const navigation=p=>'https://uri.amap.com/marker?'+new URLSearchParams({position:`${p.mapMatch.lng},${p.mapMatch.lat}`,name:p.name,coordinate:'gaode',callnative:'1',src:'nanyang-family'});
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
 let settled=false,browserStarted=false,amapTimer=0,browserTimer=0,convertTimer=0;
 const clearTimers=()=>{clearTimeout(amapTimer);clearTimeout(browserTimer);clearTimeout(convertTimer);};
 const finish=()=>{if(settled)return false;settled=true;clearTimers();button.disabled=false;return true;};
 const fail=message=>{if(!finish())return;status.textContent=message;};
 const succeed=(point,label,message)=>{if(!finish())return;setOrigin(point,label);status.textContent=message;};
 const diagnostic=reason=>reason?' 高德诊断：'+reason:'';
 const startBrowserFallback=reason=>{
  if(settled||browserStarted)return;
  browserStarted=true;
  clearTimeout(amapTimer);
  status.textContent='高德定位未响应，正在尝试浏览器定位…';
  if(!navigator.geolocation){fail('当前浏览器未提供定位接口。请检查系统位置服务，或用“地图上选出发位置”。'+diagnostic(reason));return;}
  browserTimer=setTimeout(()=>fail('手机浏览器未返回定位结果，请检查网站定位权限和系统定位服务后重试。'+diagnostic(reason)),18000);
  try{
   navigator.geolocation.getCurrentPosition(pos=>{
    if(settled)return;
    clearTimeout(browserTimer);
    status.textContent='已取得设备位置，正在转换地图坐标…';
    convertTimer=setTimeout(()=>fail('已取得设备位置，但地图坐标转换超时，请检查网络后重试。'),10000);
    try{
     AMap.convertFrom([pos.coords.longitude,pos.coords.latitude],'gps',(state,result)=>{
      if(settled)return;
      clearTimeout(convertTimer);
      if(state==='complete'&&result.locations?.length){
       const accuracy=pos.coords.accuracy;
       const message=Number.isFinite(accuracy)&&accuracy>0?'设备定位成功，估算误差约 '+Math.round(accuracy)+' 米。':'设备定位成功，已转换为地图坐标。';
       succeed({lng:result.locations[0].lng,lat:result.locations[0].lat},'设备当前位置',message);
      }else fail('已取得设备位置，但地图坐标转换失败，请检查网络与代理配置后重试。');
     });
    }catch(error){fail('地图坐标转换请求启动失败，请检查网络后重试。');}
   },error=>{
    const messages={1:'位置权限被拒绝，请在浏览器和系统设置中允许此网站定位。',2:'设备或浏览器未能提供位置，请检查系统定位服务与网络。',3:'设备定位超时，请重试或手动选点。'};
    fail((messages[error?.code]||'设备定位失败。')+diagnostic(reason));
   },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }catch(error){fail('浏览器定位启动失败，请检查网站和系统定位权限后重试。'+diagnostic(reason));}
 };
 amapTimer=setTimeout(()=>startBrowserFallback('高德定位等待超时'),12000);
 try{
  AMap.plugin('AMap.Geolocation',()=>{
   if(settled||browserStarted)return;
   try{
    const geolocation=new AMap.Geolocation({enableHighAccuracy:true,timeout:12000,convert:true,noIpLocate:2});
    geolocation.getCurrentPosition((state,r)=>{
     if(settled)return;
     if(state==='complete'&&r?.position){
      const message=r.accuracy?'定位成功，估算误差约 '+Math.round(r.accuracy)+' 米。':(r.location_type||'定位成功')+'；服务未提供精度数据，位置可能有偏差。请对照地图或点“地图上选出发位置”修正。';
      succeed({lng:r.position.lng,lat:r.position.lat},'我的当前位置',message);
     }else startBrowserFallback(String(r?.message||r?.info||'高德定位未成功'));
    });
   }catch(error){startBrowserFallback('高德定位启动失败');}
  });
 }catch(error){startBrowserFallback('高德定位启动失败');}
}
$('#locate').onclick=locate;$('#pick').onclick=()=>{if(!ready)return;picking=!picking;$('#pick').textContent=picking?'请点击地图上的出发位置':'地图上选出发位置';$('#status').textContent=picking?'点击地图空白处设置出发位置。':'已取消选择。';};$('#radius').onchange=render;$('#query').oninput=render;$('#list').onclick=e=>{const b=e.target.closest('[data-place]');if(b)openPlace(b.dataset.place);};$('#close-detail').onclick=()=>$('#detail').close();document.addEventListener('footprint-select',e=>openPlace(e.detail.name));
(async()=>{places=await(await fetch('places.json',{cache:'no-store'})).json();render();const config=window.NANYANG_MAP_CONFIG||{},key=config.amapKey||localStorage.getItem('amapKey')||'',serviceHost=config.serviceHost||localStorage.getItem('amapServiceHost')||'';if(!key||!serviceHost){$('#status').textContent='地图服务尚未配置：需要受域名限制的高德 JS API Key 和服务端代理地址；不要把 securityJsCode 填进网页。';return;}window._AMapSecurityConfig={serviceHost};const script=document.createElement('script');script.src='https://webapi.amap.com/maps?'+new URLSearchParams({v:'2.0',key});await new Promise((ok,no)=>{script.onload=ok;script.onerror=no;document.head.append(script)});const el=document.createElement('div');el.className='footprint-map';el.dataset.detailMode='external';const data=rows(visible());if(!data.length)data.push({name:'南阳浏览中心',coordinates:'112.5283,32.9908'});const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));el.dataset.json=url;el.dataset.amapKey=key;$('#map').replaceChildren(el);mapUI=await FootprintMap.bootstrapMap(el);URL.revokeObjectURL(url);if(!mapUI)throw Error('map');mapUI.onPick(p=>{if(picking)setOrigin(p,'地图选定的出发位置')});mapUI.update([]);mapUI.center([112.56,33.0],12);ready=true;$('#status').textContent=`地图已就绪：已收录 ${places.length} 条材料，其中 ${places.filter(p=>p.mapMatch).length} 个地点可在地图浏览。点击“定位我，找附近”后才会请求设备位置。`;})().catch(error=>{console.error(error.message);$('#status').textContent='地图服务加载失败，地点材料仍可查看，请检查网络或地图配置。'});
