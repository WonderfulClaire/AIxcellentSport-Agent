import{i as e,n as t,t as n}from"./jsx-runtime-BF6S49EV.js";import{t as r}from"./preload-helper-HclGiUj8.js";import{a as i,t as a}from"./config-CwwKxFKJ.js";import{l as o,o as s}from"./healthStore-Q2YI99BT.js";import{i as c,r as l}from"./dailyLog-DgavPQ7O.js";var u=e(t(),1),d=`你是一个食物营养识别专家。请识别这张图片里的这道菜/这份食物，估算它的份量(克)与营养。
只输出一行严格 JSON，不要任何解释、不要 markdown 代码块：
{"name":"食物中文名","portion_g":整数,"kcal":整数,"protein_g":数字,"carbs_g":数字,"fat_g":数字,"confidence":0到1的小数}
若图片里看不出明确食物，返回 {"name":"未知","portion_g":0,"kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"confidence":0}。`;function f(e,t=768,n=.82){return new Promise((r,i)=>{let a=URL.createObjectURL(e),o=new Image;o.onload=()=>{try{let{width:e,height:s}=o;if(e>t||s>t){let n=Math.min(t/e,t/s);e=Math.round(e*n),s=Math.round(s*n)}let c=document.createElement(`canvas`);c.width=e,c.height=s;let l=c.getContext(`2d`);if(!l){URL.revokeObjectURL(a),i(Error(`canvas unavailable`));return}l.drawImage(o,0,0,e,s),URL.revokeObjectURL(a),r(c.toDataURL(`image/jpeg`,n))}catch(e){URL.revokeObjectURL(a),i(e)}},o.onerror=()=>{URL.revokeObjectURL(a),i(Error(`image load failed`))},o.src=a})}function p(e){if(!e)return null;let t=e.trim(),n=t.match(/```(?:json)?\s*([\s\S]*?)```/i);n&&(t=n[1].trim());let r=t.indexOf(`{`),i=t.lastIndexOf(`}`);if(r===-1||i===-1||i<r)return null;try{return JSON.parse(t.slice(r,i+1))}catch{return null}}async function m(e){let t=a();if(!t)return null;let n;try{n=await f(e)}catch{return null}let r=[{role:`user`,content:[{type:`image_url`,image_url:{url:n}},{type:`text`,text:d}]}],o=null;try{o=await i(r,{...t,timeoutMs:15e3})}catch{return null}let s=p(o||``);if(!s||!s.name||s.name===`未知`||!s.kcal)return null;let c=(e,t=0)=>typeof e==`number`&&isFinite(e)?e:t;return{name:String(s.name).slice(0,40),portion_g:Math.max(0,Math.round(c(s.portion_g))),kcal:Math.max(0,Math.round(c(s.kcal))),protein_g:Math.max(0,c(s.protein_g)),carbs_g:Math.max(0,c(s.carbs_g)),fat_g:Math.max(0,c(s.fat_g)),confidence:Math.min(1,Math.max(0,c(s.confidence,.5)))}}var h=[{name:`米饭(熟)`,aliases:[`米饭`,`白饭`,`大米饭`],kcal100:116,protein100:2.6,carbs100:25.9,fat100:.3,cat:`staple`,portions:[{label:`1碗 150g`,grams:150},{label:`1两 50g`,grams:50}]},{name:`糙米饭(熟)`,aliases:[`糙米饭`,`粗粮饭`],kcal100:123,protein100:2.8,carbs100:25.9,fat100:1,cat:`staple`,portions:[{label:`1碗 150g`,grams:150}]},{name:`馒头`,aliases:[`馒头`],kcal100:223,protein100:7,carbs100:47,fat100:1.1,cat:`staple`,portions:[{label:`1个 100g`,grams:100}]},{name:`面条(熟)`,aliases:[`面条`,`面`,`汤面`],kcal100:110,protein100:4,carbs100:22,fat100:.6,cat:`staple`,portions:[{label:`1碗 250g`,grams:250}]},{name:`全麦面包`,aliases:[`全麦面包`,`whole wheat bread`],kcal100:246,protein100:8.8,carbs100:43,fat100:4.5,cat:`staple`,portions:[{label:`2片 80g`,grams:80}]},{name:`白面包`,aliases:[`面包`,`吐司`],kcal100:265,protein100:9,carbs100:49,fat100:3.2,cat:`staple`,portions:[{label:`2片 80g`,grams:80}]},{name:`粥(白米)`,aliases:[`粥`,`白粥`,`米粥`],kcal100:46,protein100:1.1,carbs100:9.9,fat100:.3,cat:`staple`,portions:[{label:`1碗 300g`,grams:300}]},{name:`燕麦(干)`,aliases:[`燕麦`,`oats`,`麦片`],kcal100:367,protein100:15,carbs100:61,fat100:7,cat:`staple`,portions:[{label:`1份 40g`,grams:40}]},{name:`红薯`,aliases:[`红薯`,`地瓜`,`番薯`],kcal100:99,protein100:1.1,carbs100:23.1,fat100:.2,cat:`staple`,portions:[{label:`1个 150g`,grams:150}]},{name:`土豆`,aliases:[`土豆`,`马铃薯`,`洋芋`],kcal100:77,protein100:2,carbs100:17.2,fat100:.2,cat:`staple`,portions:[{label:`1个 150g`,grams:150}]},{name:`鸡胸肉(熟)`,aliases:[`鸡胸肉`,`鸡胸`,`鸡肉`],kcal100:165,protein100:31,carbs100:0,fat100:3.6,cat:`protein`,portions:[{label:`100g`,grams:100}]},{name:`鸡蛋`,aliases:[`鸡蛋`,`蛋`,`水煮蛋`],kcal100:144,protein100:13.3,carbs100:2.8,fat100:8.8,cat:`protein`,portions:[{label:`1个 50g`,grams:50}]},{name:`牛肉(瘦)`,aliases:[`牛肉`,`瘦牛肉`],kcal100:125,protein100:20.2,carbs100:1.2,fat100:4.2,cat:`protein`,portions:[{label:`100g`,grams:100}]},{name:`猪里脊`,aliases:[`猪肉`,`里脊`,`瘦肉`],kcal100:155,protein100:20.2,carbs100:1.5,fat100:7.9,cat:`protein`,portions:[{label:`100g`,grams:100}]},{name:`三文鱼`,aliases:[`三文鱼`,` salmon`],kcal100:208,protein100:20,carbs100:0,fat100:13,cat:`protein`,portions:[{label:`100g`,grams:100}]},{name:`虾`,aliases:[`虾`,`基围虾`],kcal100:93,protein100:18.6,carbs100:1,fat100:1,cat:`protein`,portions:[{label:`100g`,grams:100}]},{name:`豆腐`,aliases:[`豆腐`,`嫩豆腐`],kcal100:81,protein100:8.1,carbs100:3.8,fat100:3.7,cat:`protein`,portions:[{label:`100g`,grams:100}]},{name:`鸡腿肉(去皮)`,aliases:[`鸡腿`,`鸡腿肉`],kcal100:147,protein100:21,carbs100:0,fat100:7,cat:`protein`,portions:[{label:`100g`,grams:100}]},{name:`西兰花`,aliases:[`西兰花`,`绿花菜`],kcal100:34,protein100:2.8,carbs100:6.6,fat100:.4,cat:`veg`,portions:[{label:`1份 100g`,grams:100}]},{name:`番茄`,aliases:[`番茄`,`西红柿`],kcal100:18,protein100:.9,carbs100:3.9,fat100:.2,cat:`veg`,portions:[{label:`1个 120g`,grams:120}]},{name:`黄瓜`,aliases:[`黄瓜`,`青瓜`],kcal100:15,protein100:.7,carbs100:3,fat100:.1,cat:`veg`,portions:[{label:`1根 100g`,grams:100}]},{name:`生菜`,aliases:[`生菜`,`沙拉菜`],kcal100:15,protein100:1.4,carbs100:2.9,fat100:.2,cat:`veg`,portions:[{label:`1份 100g`,grams:100}]},{name:`菠菜`,aliases:[`菠菜`],kcal100:23,protein100:2.6,carbs100:3.6,fat100:.3,cat:`veg`,portions:[{label:`1份 100g`,grams:100}]},{name:`胡萝卜`,aliases:[`胡萝卜`,`红萝卜`],kcal100:39,protein100:1,carbs100:8.8,fat100:.2,cat:`veg`,portions:[{label:`1根 80g`,grams:80}]},{name:`苹果`,aliases:[`苹果`],kcal100:52,protein100:.2,carbs100:13.5,fat100:.2,cat:`fruit`,portions:[{label:`1个 中 180g`,grams:180}]},{name:`香蕉`,aliases:[`香蕉`],kcal100:89,protein100:1.1,carbs100:22,fat100:.3,cat:`fruit`,portions:[{label:`1根 中 120g`,grams:120}]},{name:`橙子`,aliases:[`橙子`,`柳橙`],kcal100:47,protein100:.8,carbs100:11.1,fat100:.2,cat:`fruit`,portions:[{label:`1个 中 150g`,grams:150}]},{name:`葡萄`,aliases:[`葡萄`],kcal100:43,protein100:.5,carbs100:10.3,fat100:.2,cat:`fruit`,portions:[{label:`1串 150g`,grams:150}]},{name:`西瓜`,aliases:[`西瓜`],kcal100:30,protein100:.6,carbs100:7.2,fat100:.1,cat:`fruit`,portions:[{label:`1块 200g`,grams:200}]},{name:`蓝莓`,aliases:[`蓝莓`,`blueberry`],kcal100:57,protein100:.7,carbs100:14.5,fat100:.3,cat:`fruit`,portions:[{label:`1盒 125g`,grams:125}]},{name:`牛奶(全脂)`,aliases:[`牛奶`,`milk`],kcal100:54,protein100:3,carbs100:3.4,fat100:3.2,cat:`dairy`,portions:[{label:`1杯 250ml`,grams:250}]},{name:`无糖酸奶`,aliases:[`酸奶`,`yogurt`,`希腊酸奶`],kcal100:59,protein100:3.5,carbs100:4.7,fat100:3.3,cat:`dairy`,portions:[{label:`1杯 200g`,grams:200}]},{name:`豆浆`,aliases:[`豆浆`,`soy milk`],kcal100:31,protein100:3,carbs100:1.2,fat100:1.6,cat:`dairy`,portions:[{label:`1杯 250ml`,grams:250}]},{name:`蔬菜沙拉(无酱)`,aliases:[`沙拉`,`蔬菜沙拉`,`salad`],kcal100:20,protein100:1,carbs100:4,fat100:.2,cat:`veg`,portions:[{label:`1份 150g`,grams:150}]},{name:`美式咖啡(黑)`,aliases:[`咖啡`,`黑咖啡`,`美式`],kcal100:2,protein100:.1,carbs100:0,fat100:0,cat:`drink`,portions:[{label:`1杯 240ml`,grams:240}]},{name:`可乐`,aliases:[`可乐`,`汽水`],kcal100:43,protein100:0,carbs100:10.6,fat100:0,cat:`drink`,portions:[{label:`1罐 330ml`,grams:330}]},{name:`巧克力`,aliases:[`巧克力`,`chocolate`],kcal100:546,protein100:4.9,carbs100:61,fat100:29,cat:`snack`,portions:[{label:`1块 20g`,grams:20}]},{name:`薯片`,aliases:[`薯片`,`chips`],kcal100:548,protein100:7,carbs100:53,fat100:35,cat:`snack`,portions:[{label:`1袋 50g`,grams:50}]},{name:`坚果(混合)`,aliases:[`坚果`,`nuts`,`杏仁`],kcal100:600,protein100:18,carbs100:20,fat100:50,cat:`snack`,portions:[{label:`1把 25g`,grams:25}]}];(()=>{let e=new Map;for(let t of h){e.set(t.name.toLowerCase(),t);for(let n of t.aliases)e.set(n.toLowerCase(),t)}return e})();function ee(e,t=12){let n=(e||``).trim().toLowerCase();if(!n)return h.slice(0,t);let r=[];for(let e of h){let t=(e.name+` `+e.aliases.join(` `)).toLowerCase();t.includes(n)&&r.push({f:e,s:+!t.startsWith(n)})}return r.sort((e,t)=>e.s-t.s),r.slice(0,t).map(e=>e.f)}function g(e,t){let n=t/100;return{kcal:Math.round(e.kcal100*n),protein:Math.round(e.protein100*n*10)/10,carbs:Math.round(e.carbs100*n*10)/10,fat:Math.round(e.fat100*n*10)/10}}var _={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,athlete:1.9},v=[{key:`sedentary`,label:`久坐`,desc:`极少运动`},{key:`light`,label:`轻度`,desc:`每周1-3次`},{key:`moderate`,label:`中度`,desc:`每周3-5次`},{key:`active`,label:`高度`,desc:`每周6-7次`}];function y(e){if(!e)return!1;let t=String(e).toLowerCase();return t.startsWith(`f`)||t===`女`||t===`female`}function b(e){if(!e)return null;let t=new Date().getFullYear()-e;return t>0&&t<120?t:null}function te(e,t){let n=y(e.sex),r=n?1500:1700,i=!1;if(e.weight&&e.weight>0){let t=Math.round(e.weight*30);t>r&&(r=t,i=!0)}t?.sweat&&(r+=500);let a=Math.max(4,Math.round(r/250)),o=`《中国居民膳食指南2022》`+(i?` · 30ml/kg体重`:n?` · 女性1500ml`:` · 男性1700ml`)+(t?.sweat?` · 运动/高温+500ml`:``);return{ml:a*250,cups:a,basis:o}}function ne(e){let t=b(e.birth_year);return t&&t>=65?{goal:6e3,min:6e3,basis:`膳食指南·老年主动活动 6000 步`}:{goal:8e3,min:6e3,basis:`膳食指南 6000 步循证底线 · 8000 步获益更优`}}function re(e){let t=b(e.birth_year);return t&&t>=65?{min:7,max:8,basis:`老年人 7-8 小时`}:{min:7,max:9,basis:`National Sleep Foundation 成人 7-9 小时`}}function ie(e){let t=b(e.birth_year),n=[];if(e.height||n.push(`身高`),e.weight||n.push(`体重`),t||n.push(`年龄`),n.length)return{ok:!1,basis:`Mifflin-St Jeor 公式`,missing:n};let r=y(e.sex),i=e.weight,a=e.height,o=t,s=Math.round(r?10*i+6.25*a-5*o-161:10*i+6.25*a-5*o+5),c=e.activity&&_[e.activity]?e.activity:`light`,l=Math.round(s*_[c]),u=v.find(e=>e.key===c)?.label||`轻度`,d=(e.goals||[]).join(` `),f=`maintain`;/减脂|减重|瘦|塑形|燃脂|fat|lose/i.test(d)?f=`lose`:/增肌|增重|肌肉|muscle|gain|bulk/i.test(d)&&(f=`gain`);let p=f===`lose`?`减脂`:f===`gain`?`增肌`:`维持`,m=l;f===`lose`?m=Math.round(l*.8):f===`gain`&&(m=Math.round(l*1.1));let h=Math.round(i*(f===`maintain`?1.6:2)),ee=Math.round(m*(f===`lose`?.25:.27)/9),g=Math.max(0,Math.round((m-h*4-ee*9)/4));return{ok:!0,bmr:s,tdee:l,target:m,protein:h,carbs:g,fat:ee,goalLabel:p,activityLabel:u,basis:`Mifflin-St Jeor 公式 + 活动系数`}}var x=n(),S=[{key:`high`,label:`精力满满`,emoji:`⚡`,color:`#D4AF37`,desc:`今天要高效产出，适合高强度训练+专注工作`},{key:`normal`,label:`平稳状态`,emoji:`🌤️`,color:`#7CB9E8`,desc:`正常节奏，保持规律饮食和适度运动`},{key:`rest`,label:`休息恢复`,emoji:`🛋️`,color:`#98D8C8`,desc:`身体需要修复，以拉伸、冥想和早睡为主`},{key:`low`,label:`低能量日`,emoji:`🔋`,color:`#B8A9C9`,desc:`允许自己慢下来，做最基本的事就好`}],ae={breakfast:`早餐`,lunch:`午餐`,dinner:`晚餐`,snack:`加餐`},oe=[{name:`米饭(1碗·150g)`,cal:174,cat:`carbs`},{name:`全麦面包(2片)`,cal:160,cat:`carbs`},{name:`面条(1碗·熟250g)`,cal:280,cat:`carbs`},{name:`鸡蛋(1个)`,cal:78,cat:`protein`},{name:`鸡胸肉(100g)`,cal:165,cat:`protein`},{name:`牛奶(1杯·250ml)`,cal:160,cat:`protein`},{name:`苹果(1个·中)`,cal:95,cat:`fruit`},{name:`香蕉(1根·中)`,cal:105,cat:`fruit`},{name:`蔬菜沙拉(无酱)`,cal:50,cat:`veg`},{name:`美式咖啡(黑)`,cal:5,cat:`drink`}];function C(e,t=null){try{let n=localStorage.getItem(e);return n?JSON.parse(n):t}catch{return t}}function w(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function T(){return new Date().toISOString().slice(0,10)}function se(){let e=T();return C(`aix_water_v1`,{})[e]||{date:e,cups:0,lastDrink:0}}function ce(e){let t=T(),n=C(`aix_water_v1`,{});n[t]=e,w(`aix_water_v1`,n)}function le(){let e=T();return C(`aix_energy_v1`,{})[e]||`normal`}function ue(e){let t=T(),n=C(`aix_energy_v1`,{});n[t]=e,w(`aix_energy_v1`,n)}function de(){let e=T();return C(`aix_quickmeals_v1`,{})[e]||[]}function fe(e){let t=T(),n=C(`aix_quickmeals_v1`,{});n[t]||(n[t]=[]),n[t].push({...e,id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`}),w(`aix_quickmeals_v1`,n)}function pe(e){let t=T(),n=C(`aix_quickmeals_v1`,{});n[t]&&(n[t]=n[t].filter(t=>t.id!==e)),w(`aix_quickmeals_v1`,n)}function me(){return C(`aix_activity_v1`,`light`)}function he(e){w(`aix_activity_v1`,e)}async function ge(){try{return(await r(()=>import(`./tcmEngine-CMbS1c9Y.js`),[],import.meta.url)).generateDailyWellnessAdvice({},{},`balanced`)}catch{return null}}var E=`aix_food_history`;function D(){try{let e=localStorage.getItem(E),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}function _e(e){try{localStorage.setItem(E,JSON.stringify(e.slice(0,20)))}catch{}}function ve(e,t,n){_e([{id:Date.now()+`-`+Math.random().toString(36).slice(2,7),ts:Date.now(),name:e,kcal:t,protein:n?.protein||0,carbs:n?.carbs||0,fat:n?.fat||0},...D().filter(t=>t.name!==e)])}function ye({onToModule:e,onLogin:t}){let[n,r]=(0,u.useState)(se),[i,d]=(0,u.useState)(le),[f,p]=(0,u.useState)(!1),[h,_]=(0,u.useState)(de),[y,b]=(0,u.useState)(!1),[C,w]=(0,u.useState)(``),[E,ye]=(0,u.useState)(null),[O,be]=(0,u.useState)(null),[xe,Se]=(0,u.useState)(0),[Ce,we]=(0,u.useState)(null),[k,Te]=(0,u.useState)(()=>l()??``),[Ee,De]=(0,u.useState)(me),[Oe,ke]=(0,u.useState)(!1),Ae=(0,u.useRef)([]),[je,Me]=(0,u.useState)(!1),[A,Ne]=(0,u.useState)(null),[Pe,Fe]=(0,u.useState)(null),[j,M]=(0,u.useState)(!1),[Ie,N]=(0,u.useState)(null),[Le,P]=(0,u.useState)(``),[Re,ze]=(0,u.useState)(``),[F,I]=(0,u.useState)(null),[L,R]=(0,u.useState)(100),[Be,Ve]=(0,u.useState)(``),[z,He]=(0,u.useState)(0),[B,V]=(0,u.useState)({protein:0,carbs:0,fat:0}),Ue=(0,u.useRef)(null),We=!!a(),[H,Ge]=(0,u.useState)(()=>D()),[Ke,qe]=(0,u.useState)(!1),[U,Je]=(0,u.useState)(null),[W,Ye]=(0,u.useState)(1),Xe=i===`high`,G={...Ce||{},activity:Ee},Ze=te(G,{sweat:Xe}),K=ne(G),Qe=re(G),q=ie(G),J=Ze.cups;(0,u.useEffect)(()=>{ge().then(ye),s().then(e=>we(e||null)).catch(()=>{}),o().then(e=>{let t=T(),n=e?.find(e=>e.date===t);n?.steps&&be(n.steps),n?.workouts&&Se(typeof n.workouts==`number`?n.workouts:1)}).catch(()=>{})},[]);let $e=(0,u.useCallback)(e=>{!e||e<20||e>300||(c(e),Te(e),Y(`已记录今日体重 ${e} kg 📉`))},[Y]),Y=(0,u.useCallback)(e=>{w(e),setTimeout(()=>w(``),2200)},[]),et=(0,u.useCallback)(e=>{if(e<n.cups)return;let t={...n,cups:e+1,lastDrink:Date.now()};r(t),ce(t);let i=Ae.current[e];i&&(i.classList.add(`td-cup-pop`),window.setTimeout(()=>i.classList.remove(`td-cup-pop`),500)),J-(e+1)<=0?Y(`今日饮水目标达成！💧 太棒了`):(e+1)%4==0?Y(`已喝 ${e+1} 杯水，继续加油！`):Y(`+250ml 💧`)},[n,J,Y]),tt=(0,u.useCallback)(()=>{if(n.cups<=0)return;let e={...n,cups:n.cups-1};r(e),ce(e)},[n]),nt=(0,u.useCallback)(e=>{d(e),ue(e),p(!1),Y(`今日状态：${S.find(t=>t.key===e)?.label}`)},[Y]),rt=(0,u.useCallback)(e=>{De(e),he(e),ke(!1),Y(`活动水平：${v.find(t=>t.key===e)?.label} · 热量目标已更新`)},[Y]),X=(0,u.useCallback)((e,t,n)=>{let r=new Date().getHours(),i=`snack`;r<10?i=`breakfast`:r<14?i=`lunch`:r<20&&(i=`dinner`),fe({name:e,calories:t,mealType:i,time:`${String(r).padStart(2,`0`)}:${String(new Date().getMinutes()).padStart(2,`0`)}`,macros:n}),_(de()),b(!1),Y(`已记录：${e}（${t} kcal）`)},[Y]),Z=(0,u.useCallback)(()=>{A&&URL.revokeObjectURL(A),Ne(null),Fe(null),M(!1),N(null),P(``),I(null),ze(``),Me(!1)},[A]),it=(0,u.useCallback)(async e=>{A&&URL.revokeObjectURL(A),Fe(e),Ne(URL.createObjectURL(e)),M(!0),N(null),I(null),P(``);try{let t=await m(e);t?(N(t),Ve(t.name),He(t.kcal),V({protein:t.protein_g,carbs:t.carbs_g,fat:t.fat_g})):P(We?`AI 没能从这张图识别出来，可以手动选择（下方）。`:`未配置 AI 视觉模型，已切换为手动选择（去「设置」填写 LLM 配置后即可自动识别）。`)}catch{P(`识别出错，请手动选择（下方）。`)}finally{M(!1)}},[A,We]),at=(0,u.useCallback)(e=>{I(e),R(e.portions[0]?.grams||100)},[]),ot=(0,u.useCallback)(()=>{if(!F)return;let e=g(F,L);X(F.name,e.kcal,{protein:e.protein,carbs:e.carbs,fat:e.fat}),ve(F.name,e.kcal,{protein:e.protein,carbs:e.carbs,fat:e.fat}),Ge(D()),Z()},[F,L,X,Z]),st=(0,u.useCallback)(()=>{let e=Be||`识别食物`;X(e,z,B),ve(e,z,B),Ge(D()),Z()},[Be,z,B,X,Z]),ct=(0,u.useCallback)(e=>{pe(e),_(de())},[]),lt=(0,u.useCallback)(e=>{Je(e),Ye(1)},[]),ut=(0,u.useCallback)(()=>{if(!U)return;let e=U,t=Math.round(e.kcal*W),n={protein:+(e.protein*W).toFixed(1),carbs:+(e.carbs*W).toFixed(1),fat:+(e.fat*W).toFixed(1)};X(e.name,t,n),Y(`已加入：${e.name}（${t} kcal · ${W}×）`),Je(null)},[U,W,X,Y]),dt=(0,u.useCallback)(()=>{_e([]),Ge([])},[]),ft=h.reduce((e,t)=>e+t.calories,0),pt=h.reduce((e,t)=>e+(t.macros?.protein||0),0),mt=h.reduce((e,t)=>e+(t.macros?.carbs||0),0),ht=h.reduce((e,t)=>e+(t.macros?.fat||0),0),gt=pt+mt+ht>0,_t=Math.round(n.cups/J*100),Q=S.find(e=>e.key===i)||S[1],vt=new Date,yt=`${vt.getMonth()+1}月${vt.getDate()}日 星期${`日一二三四五六`[vt.getDay()]}`,$=q.ok?q.target:null,bt=$===null?null:Math.max(0,$-ft);return(0,x.jsxs)(`div`,{className:`today-dashboard`,children:[C&&(0,x.jsx)(`div`,{className:`td-toast`,children:C}),(0,x.jsxs)(`header`,{className:`td-header`,children:[(0,x.jsxs)(`div`,{className:`td-header-top`,children:[(0,x.jsx)(`span`,{className:`td-date`,children:yt}),(0,x.jsx)(`button`,{className:`td-login-hint`,onClick:t,children:`登录同步 →`})]}),E?.solarTerm&&(0,x.jsxs)(`div`,{className:`td-solar-card`,children:[(0,x.jsxs)(`div`,{className:`td-solar-left`,children:[(0,x.jsx)(`span`,{className:`td-solar-name`,children:E.solarTerm.name}),(0,x.jsxs)(`span`,{className:`td-solar-countdown`,children:[`距「`,E.solarTerm.next||``,`」还有 `,E.solarTerm.daysToNext||`?`,` 天`]})]}),(0,x.jsxs)(`div`,{className:`td-solar-right`,children:[(0,x.jsxs)(`div`,{className:`td-solar-tcm`,children:[(0,x.jsx)(`span`,{className:`td-solar-label`,children:`养生原则`}),(0,x.jsx)(`span`,{children:E.solarTerm.principle||E.current?.tcm||``})]}),(E.solarTerm.recommendedDiet||E.current?.diet)&&(0,x.jsxs)(`div`,{className:`td-solar-row`,children:[(0,x.jsxs)(`div`,{className:`td-solar-item`,children:[(0,x.jsx)(`span`,{className:`td-solar-label`,children:`推荐食材`}),(0,x.jsx)(`span`,{children:E.solarTerm.recommendedDiet||E.current?.diet||``})]}),E.solarTerm.recommendedExercise&&(0,x.jsxs)(`div`,{className:`td-solar-item`,children:[(0,x.jsx)(`span`,{className:`td-solar-label`,children:`推荐运动`}),(0,x.jsx)(`span`,{children:E.solarTerm.recommendedExercise})]})]})]})]}),(0,x.jsxs)(`div`,{className:`td-weight-quick`,children:[(0,x.jsx)(`span`,{className:`td-weight-emoji`,children:`⚖️`}),(0,x.jsx)(`span`,{className:`td-weight-label`,children:`今日体重`}),(0,x.jsx)(`input`,{className:`td-weight-input`,type:`number`,inputMode:`decimal`,placeholder:`--`,value:k,onChange:e=>Te(e.target.value===``?``:Number(e.target.value)),onBlur:()=>k!==``&&$e(Number(k)),onKeyDown:e=>{e.key===`Enter`&&k!==``&&$e(Number(k))}}),(0,x.jsx)(`span`,{className:`td-weight-unit`,children:`kg`}),(0,x.jsx)(`button`,{className:`td-weight-save`,onClick:()=>k!==``&&$e(Number(k)),children:`记录`})]})]}),(0,x.jsxs)(`section`,{className:`td-section td-energy-section`,children:[(0,x.jsxs)(`div`,{className:`td-section-head`,children:[(0,x.jsx)(`h3`,{children:`今日能量目标`}),(0,x.jsx)(`button`,{className:`td-change-btn`,onClick:()=>p(!f),children:`切换`})]}),f?(0,x.jsx)(`div`,{className:`td-energy-grid`,children:S.map(e=>(0,x.jsxs)(`button`,{className:`td-energy-chip ${i===e.key?`active`:``}`,style:{borderColor:i===e.key?e.color:void 0},onClick:()=>nt(e.key),children:[(0,x.jsx)(`span`,{className:`td-e-emoji`,children:e.emoji}),(0,x.jsx)(`span`,{className:`td-e-label`,children:e.label}),(0,x.jsx)(`span`,{className:`td-e-desc`,children:e.desc})]},e.key))}):(0,x.jsxs)(`div`,{className:`td-energy-selected`,style:{borderLeftColor:Q.color},children:[(0,x.jsx)(`span`,{className:`td-energy-emoji`,children:Q.emoji}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`div`,{className:`td-energy-label`,style:{color:Q.color},children:Q.label}),(0,x.jsx)(`div`,{className:`td-energy-desc`,children:Q.desc})]})]}),E?.todayTips?.length>0&&(0,x.jsxs)(`div`,{className:`td-tips-bar`,children:[(0,x.jsx)(`span`,{className:`td-tips-icon`,children:`💡`}),(0,x.jsx)(`span`,{children:E.todayTips[0]})]})]}),(0,x.jsxs)(`section`,{className:`td-section td-water-section`,children:[(0,x.jsxs)(`div`,{className:`td-section-head`,children:[(0,x.jsx)(`h3`,{children:`喝水打卡 💧`}),(0,x.jsxs)(`span`,{className:`td-water-stat`,children:[n.cups,`/`,J,` 杯 · `,n.cups*250,`/`,Ze.ml,`ml`,(0,x.jsx)(`span`,{className:`td-water-pct`,style:{width:`${Math.min(_t,100)}%`}})]})]}),(0,x.jsx)(`div`,{className:`td-cups-grid`,children:Array.from({length:J}).map((e,t)=>{let r=t<n.cups;return(0,x.jsxs)(`div`,{ref:e=>{Ae.current[t]=e},className:`td-cup ${r?`filled`:``}`,onClick:()=>r?void 0:et(t),title:r?`第 ${t+1} 杯 ✓`:`点击喝一杯`,children:[(0,x.jsxs)(`svg`,{viewBox:`0 0 40 44`,className:`td-cup-svg`,children:[(0,x.jsx)(`path`,{d:`M6 4 h28 l-4 32 c-0.5 4-3 7-10 7 s-9.5-3-10-7 z`,className:r?`td-cup-fill`:`td-cup-outline`}),r&&(0,x.jsx)(`path`,{d:`M14 16 L18 22 L26 12`,stroke:`#0A0A0B`,strokeWidth:`2.5`,fill:`none`,strokeLinecap:`round`,strokeLinejoin:`round`})]}),(0,x.jsx)(`span`,{className:`td-cup-num`,children:t+1})]},t)})}),(0,x.jsxs)(`div`,{className:`td-basis`,children:[`目标依据：`,Ze.basis,`（1 杯≈`,250,`ml）`]}),n.cups>0&&_t<100&&(0,x.jsx)(`button`,{className:`td-undo-btn`,onClick:tt,children:`撤销一杯`}),_t>=100&&(0,x.jsx)(`div`,{className:`td-water-celebration`,children:`今日饮水达标！保持这个好习惯 🎉`})]}),(0,x.jsxs)(`section`,{className:`td-section td-diet-section`,children:[(0,x.jsxs)(`div`,{className:`td-section-head`,children:[(0,x.jsx)(`h3`,{children:`今日饮食 🍽️`}),(0,x.jsxs)(`span`,{className:`td-cal-total`,children:[ft,$===null?``:` / ${$}`,` kcal`]})]}),q.ok?(0,x.jsxs)(`div`,{className:`td-cal-goal-card`,children:[(0,x.jsxs)(`div`,{className:`td-cal-metrics`,children:[(0,x.jsxs)(`div`,{className:`td-cal-metric`,children:[(0,x.jsx)(`span`,{className:`td-cal-val`,children:q.bmr}),(0,x.jsx)(`span`,{className:`td-cal-lbl`,children:`BMR 基础代谢`})]}),(0,x.jsxs)(`div`,{className:`td-cal-metric`,children:[(0,x.jsx)(`span`,{className:`td-cal-val`,children:q.tdee}),(0,x.jsx)(`span`,{className:`td-cal-lbl`,children:`TDEE 日消耗`})]}),(0,x.jsxs)(`div`,{className:`td-cal-metric highlight`,children:[(0,x.jsx)(`span`,{className:`td-cal-val`,children:q.target}),(0,x.jsxs)(`span`,{className:`td-cal-lbl`,children:[`目标摄入·`,q.goalLabel]})]})]}),(0,x.jsxs)(`div`,{className:`td-macro-row`,children:[(0,x.jsxs)(`span`,{className:`td-macro`,children:[`蛋白 `,q.protein,`g`]}),(0,x.jsxs)(`span`,{className:`td-macro`,children:[`碳水 `,q.carbs,`g`]}),(0,x.jsxs)(`span`,{className:`td-macro`,children:[`脂肪 `,q.fat,`g`]}),(0,x.jsxs)(`button`,{className:`td-activity-btn`,onClick:()=>ke(!Oe),children:[`活动:`,q.activityLabel,` ⚙`]})]}),Oe&&(0,x.jsx)(`div`,{className:`td-activity-grid`,children:v.map(e=>(0,x.jsxs)(`button`,{className:`td-activity-chip ${Ee===e.key?`active`:``}`,onClick:()=>rt(e.key),children:[(0,x.jsx)(`span`,{className:`td-a-label`,children:e.label}),(0,x.jsx)(`span`,{className:`td-a-desc`,children:e.desc})]},e.key))}),(0,x.jsxs)(`div`,{className:`td-basis`,children:[`目标依据：`,q.basis]})]}):(0,x.jsxs)(`div`,{className:`td-cal-incomplete`,children:[(0,x.jsxs)(`span`,{children:[`完善档案（`,q.missing?.join(`、`),`）即可用 Mifflin-St Jeor 公式算出你的精准热量目标`]}),(0,x.jsx)(`button`,{className:`td-mini-btn`,onClick:()=>e?.(`member`),children:`去完善 →`})]}),h.length>0?(0,x.jsxs)(`div`,{className:`td-meal-list`,children:[h.map(e=>(0,x.jsxs)(`div`,{className:`td-meal-item`,children:[(0,x.jsx)(`span`,{className:`td-meal-type`,children:ae[e.mealType]||`其他`}),(0,x.jsx)(`span`,{className:`td-meal-name`,children:e.name}),(0,x.jsxs)(`span`,{className:`td-meal-cal`,children:[e.calories,` kcal`]}),(0,x.jsx)(`span`,{className:`td-meal-time`,children:e.time}),(0,x.jsx)(`button`,{className:`td-meal-del`,onClick:()=>ct(e.id),children:`×`})]},e.id)),(0,x.jsxs)(`div`,{className:`td-meal-summary`,children:[`共 `,h.length,` 项 · `,ft,` kcal`,bt!==null&&(0,x.jsxs)(`span`,{className:`td-goal-gap`,children:[`还可摄入 `,bt,` kcal`]})]}),gt&&(0,x.jsxs)(`div`,{className:`td-macro-tally`,children:[(0,x.jsxs)(`span`,{children:[`蛋白 `,Math.round(pt),`g`]}),(0,x.jsxs)(`span`,{children:[`碳水 `,Math.round(mt),`g`]}),(0,x.jsxs)(`span`,{children:[`脂肪 `,Math.round(ht),`g`]}),(0,x.jsx)(`span`,{className:`td-macro-note`,children:`（识别食物自动累计）`})]})]}):(0,x.jsx)(`div`,{className:`td-empty-state`,children:`今天还没记录饮食，点击下方添加`}),(0,x.jsxs)(`div`,{className:`td-food-actions`,children:[(0,x.jsx)(`button`,{className:`td-action-btn primary`,onClick:()=>{Me(!0),b(!1)},children:`📷 拍照识别`}),(0,x.jsx)(`button`,{className:`td-action-btn`,onClick:()=>b(!y),children:`+ 快速添加`}),(0,x.jsx)(`button`,{className:`td-action-btn`,onClick:()=>e?.(`diet`),children:`详细饮食追踪 →`}),(0,x.jsx)(`button`,{className:`td-action-btn`,onClick:()=>e?.(`nutrition`),children:`AI 营养订制 →`})]}),y&&(0,x.jsxs)(`div`,{className:`td-food-panel`,children:[(0,x.jsxs)(`div`,{className:`td-food-panel-head`,children:[(0,x.jsx)(`span`,{children:`快速选择常见食物`}),(0,x.jsx)(`button`,{onClick:()=>b(!1),children:`✕`})]}),(0,x.jsx)(`div`,{className:`td-food-grid`,children:oe.map(e=>(0,x.jsxs)(`button`,{className:`td-food-chip`,onClick:()=>X(e.name,e.cal),children:[(0,x.jsx)(`span`,{className:`td-f-name`,children:e.name}),(0,x.jsxs)(`span`,{className:`td-f-cal`,children:[e.cal,` kcal`]})]},e.name))}),(0,x.jsx)(`div`,{className:`td-food-photo-hint`,children:`热量参考《中国食物成分表》第6版 / USDA · 想更省事点上方「📷 拍照识别」直接拍食物估算热量`})]}),je&&(0,x.jsxs)(`div`,{className:`td-photo-panel`,children:[(0,x.jsxs)(`div`,{className:`td-photo-head`,children:[(0,x.jsx)(`span`,{children:`📷 拍照识别食物`}),(0,x.jsxs)(`div`,{className:`td-photo-head-actions`,children:[(0,x.jsxs)(`button`,{className:`td-photo-hist-btn`,onClick:()=>qe(e=>!e),children:[`🕘 历史`,H.length>0?`(${H.length})`:``]}),(0,x.jsx)(`button`,{className:`td-photo-close`,onClick:Z,children:`✕`})]})]}),(0,x.jsx)(`input`,{ref:Ue,type:`file`,accept:`image/*`,capture:`environment`,style:{display:`none`},onChange:e=>{let t=e.target.files?.[0];t&&it(t),e.currentTarget.value=``}}),A?(0,x.jsxs)(`div`,{className:`td-photo-body`,children:[(0,x.jsx)(`img`,{className:`td-photo-img`,src:A,alt:`食物预览`}),j&&(0,x.jsx)(`div`,{className:`td-photo-loading`,children:`🔍 AI 识别中…`}),!j&&Ie&&(0,x.jsxs)(`div`,{className:`td-vision-card`,children:[(0,x.jsx)(`div`,{className:`td-vision-title`,children:`AI 识别结果（可修改后添加）`}),(0,x.jsxs)(`label`,{className:`td-vision-field`,children:[`食物名`,(0,x.jsx)(`input`,{value:Be,onChange:e=>Ve(e.target.value)})]}),(0,x.jsxs)(`label`,{className:`td-vision-field`,children:[`热量 (kcal)`,(0,x.jsx)(`input`,{type:`number`,value:z,onChange:e=>He(Math.max(0,+e.target.value||0))})]}),(0,x.jsxs)(`div`,{className:`td-vision-macros`,children:[(0,x.jsxs)(`label`,{children:[`蛋白 g`,(0,x.jsx)(`input`,{type:`number`,value:B.protein,onChange:e=>V({...B,protein:Math.max(0,+e.target.value||0)})})]}),(0,x.jsxs)(`label`,{children:[`碳水 g`,(0,x.jsx)(`input`,{type:`number`,value:B.carbs,onChange:e=>V({...B,carbs:Math.max(0,+e.target.value||0)})})]}),(0,x.jsxs)(`label`,{children:[`脂肪 g`,(0,x.jsx)(`input`,{type:`number`,value:B.fat,onChange:e=>V({...B,fat:Math.max(0,+e.target.value||0)})})]})]}),(0,x.jsxs)(`div`,{className:`td-vision-actions`,children:[(0,x.jsx)(`button`,{className:`td-action-btn primary`,onClick:st,children:`添加到今日饮食`}),(0,x.jsx)(`button`,{className:`td-action-btn`,onClick:()=>Ue.current?.click(),children:`换一张`})]})]}),!j&&!Ie&&(0,x.jsxs)(`div`,{className:`td-manual-pick`,children:[Le&&(0,x.jsx)(`p`,{className:`td-photo-tip`,children:Le}),(0,x.jsx)(`input`,{className:`td-food-search`,placeholder:`搜索食物，如：米饭 / 鸡胸肉 / 苹果`,value:Re,onChange:e=>ze(e.target.value)}),(0,x.jsx)(`div`,{className:`td-food-search-list`,children:ee(Re).map(e=>(0,x.jsxs)(`button`,{className:`td-search-item ${F?.name===e.name?`active`:``}`,onClick:()=>at(e),children:[(0,x.jsx)(`span`,{className:`td-si-name`,children:e.name}),(0,x.jsxs)(`span`,{className:`td-si-kcal`,children:[e.kcal100,` kcal/100g`]})]},e.name))}),F&&(0,x.jsxs)(`div`,{className:`td-manual-detail`,children:[(0,x.jsxs)(`div`,{className:`td-portion-row`,children:[F.portions.map(e=>(0,x.jsx)(`button`,{className:`td-portion-chip ${L===e.grams?`active`:``}`,onClick:()=>R(e.grams),children:e.label},e.label)),(0,x.jsxs)(`label`,{className:`td-grams-field`,children:[`自定义 g`,(0,x.jsx)(`input`,{type:`number`,value:L,onChange:e=>R(Math.max(1,+e.target.value||0))})]})]}),(0,x.jsxs)(`div`,{className:`td-manual-kcal`,children:[`≈ `,g(F,L).kcal,` kcal （蛋白 `,g(F,L).protein,`g · 碳水 `,g(F,L).carbs,`g · 脂肪 `,g(F,L).fat,`g）`]}),(0,x.jsx)(`div`,{className:`td-vision-actions`,children:(0,x.jsx)(`button`,{className:`td-action-btn primary`,onClick:ot,children:`添加到今日饮食`})})]})]}),Ke&&(0,x.jsxs)(`div`,{className:`td-photo-history`,children:[(0,x.jsxs)(`div`,{className:`td-hist-head`,children:[(0,x.jsx)(`span`,{children:`🕘 识别历史（常吃食物，点一下重新加入今日）`}),H.length>0&&(0,x.jsx)(`button`,{className:`td-hist-clear`,onClick:dt,children:`清空`})]}),H.length===0?(0,x.jsx)(`p`,{className:`td-hist-empty`,children:`还没有识别记录，拍一张食物试试～`}):(0,x.jsx)(`div`,{className:`td-hist-list`,children:H.map(e=>(0,x.jsxs)(`div`,{className:`td-hist-item`,children:[(0,x.jsxs)(`div`,{className:`td-hist-info`,children:[(0,x.jsx)(`span`,{className:`td-hist-name`,children:e.name}),(0,x.jsxs)(`span`,{className:`td-hist-kcal`,children:[e.kcal,` kcal`,e.protein+e.carbs+e.fat>0?` · 蛋${e.protein} 碳${e.carbs} 脂${e.fat}`:``]})]}),U?.id===e.id?(0,x.jsxs)(`div`,{className:`td-hist-readd`,children:[(0,x.jsx)(`div`,{className:`td-hist-mults`,children:[.5,1,1.5,2].map(e=>(0,x.jsxs)(`button`,{className:W===e?`td-mult-btn active`:`td-mult-btn`,onClick:()=>Ye(e),children:[e,`×`]},e))}),(0,x.jsxs)(`div`,{className:`td-hist-readd-actions`,children:[(0,x.jsx)(`button`,{className:`td-hist-add`,onClick:ut,children:`确认加入`}),(0,x.jsx)(`button`,{className:`td-hist-cancel`,onClick:()=>Je(null),children:`取消`})]})]}):(0,x.jsx)(`button`,{className:`td-hist-add`,onClick:()=>lt(e),children:`再次加入`})]},e.id))})]})]}):(0,x.jsxs)(`div`,{className:`td-photo-empty`,children:[(0,x.jsx)(`p`,{children:`拍一张 / 选一张食物照片，自动估算热量与营养`}),(0,x.jsx)(`button`,{className:`td-action-btn primary`,onClick:()=>Ue.current?.click(),children:`选择 / 拍摄照片`}),!We&&(0,x.jsx)(`p`,{className:`td-photo-tip`,children:`当前未配置 AI 视觉模型，识别会自动转为「手动选择」（去「设置」填写 LLM 配置后即可自动 AI 识别）。`})]})]})]}),(0,x.jsxs)(`section`,{className:`td-section td-move-section`,children:[(0,x.jsx)(`div`,{className:`td-section-head`,children:(0,x.jsx)(`h3`,{children:`运动与活动 🏃`})}),(0,x.jsxs)(`div`,{className:`td-steps-card`,children:[(0,x.jsxs)(`div`,{className:`td-steps-left`,children:[(0,x.jsx)(`span`,{className:`td-steps-icon`,children:`👟`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`div`,{className:`td-steps-val`,children:O===null?`--`:O.toLocaleString()}),(0,x.jsx)(`div`,{className:`td-steps-label`,children:`今日步数`}),(0,x.jsxs)(`div`,{className:`td-steps-workouts`,children:[`📲 今日手表训练 `,xe,` 次`]})]})]}),(0,x.jsx)(`div`,{className:`td-steps-right`,children:O===null?(0,x.jsxs)(`div`,{className:`td-steps-empty`,children:[(0,x.jsx)(`p`,{children:`尚未同步运动数据`}),(0,x.jsx)(`button`,{className:`td-sync-btn`,onClick:()=>e?.(`wearable`),children:`连接手表 / 导入数据 →`})]}):(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)(`div`,{className:`td-steps-ring`,children:[(0,x.jsxs)(`svg`,{viewBox:`0 0 100 100`,className:`td-ring-svg`,children:[(0,x.jsx)(`circle`,{cx:`50`,cy:`50`,r:`42`,className:`td-ring-bg`}),(0,x.jsx)(`circle`,{cx:`50`,cy:`50`,r:`42`,className:`td-ring-fill`,strokeDasharray:`${Math.min(O/K.goal*264,264)} 264`})]}),(0,x.jsxs)(`span`,{className:`td-ring-pct`,children:[Math.min(Math.round(O/K.goal*100),100),`%`]})]}),(0,x.jsxs)(`span`,{className:`td-steps-goal`,children:[`目标 `,K.goal.toLocaleString()]})]})})]}),(0,x.jsxs)(`div`,{className:`td-basis`,children:[`步数依据：`,K.basis]}),(0,x.jsxs)(`div`,{className:`td-workout-row`,style:{marginTop:12},children:[(0,x.jsxs)(`button`,{className:`td-workout-card`,onClick:()=>e?.(`train`),children:[(0,x.jsx)(`span`,{className:`td-w-icon`,children:`🏋️`}),(0,x.jsx)(`span`,{className:`td-w-label`,children:`今日训练计划`}),(0,x.jsx)(`span`,{className:`td-w-desc`,children:`按目标生成，每周≥150分钟中等强度`}),(0,x.jsx)(`span`,{className:`td-w-arrow`,children:`→`})]}),(0,x.jsxs)(`button`,{className:`td-workout-card`,onClick:()=>e?.(`posture`),children:[(0,x.jsx)(`span`,{className:`td-w-icon`,children:`🤳`}),(0,x.jsx)(`span`,{className:`td-w-label`,children:`AI 姿态评估`}),(0,x.jsx)(`span`,{className:`td-w-desc`,children:`拍照检测体态问题`}),(0,x.jsx)(`span`,{className:`td-w-arrow`,children:`→`})]}),(0,x.jsxs)(`button`,{className:`td-workout-card`,onClick:()=>e?.(`video`),children:[(0,x.jsx)(`span`,{className:`td-w-icon`,children:`🎬`}),(0,x.jsx)(`span`,{className:`td-w-label`,children:`视频动作分析`}),(0,x.jsx)(`span`,{className:`td-w-desc`,children:`上传训练视频获取反馈`}),(0,x.jsx)(`span`,{className:`td-w-arrow`,children:`→`})]})]})]}),(0,x.jsxs)(`section`,{className:`td-section td-sleep-section`,children:[(0,x.jsxs)(`div`,{className:`td-section-head`,children:[(0,x.jsx)(`h3`,{children:`睡眠 😴`}),(0,x.jsxs)(`span`,{className:`td-sleep-target`,children:[`建议 `,Qe.min,`-`,Qe.max,` 小时`]})]}),(0,x.jsxs)(`div`,{className:`td-sleep-cards`,children:[(0,x.jsxs)(`button`,{className:`td-sleep-card`,onClick:()=>e?.(`sleep`),children:[(0,x.jsx)(`span`,{className:`td-sleep-icon`,children:`🌙`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`div`,{className:`td-sleep-label`,children:`记录昨晚睡眠`}),(0,x.jsx)(`div`,{className:`td-sleep-desc`,children:`入睡/醒来时间、睡眠质量分析`})]}),(0,x.jsx)(`span`,{className:`td-sleep-arrow`,children:`→`})]}),(0,x.jsxs)(`button`,{className:`td-sleep-card`,onClick:()=>e?.(`tcm`),children:[(0,x.jsx)(`span`,{className:`td-sleep-icon`,children:`🌿`}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`div`,{className:`td-sleep-label`,children:`中医节气养生`}),(0,x.jsx)(`div`,{className:`td-sleep-desc`,children:`结合节气的个性化养生方案`})]}),(0,x.jsx)(`span`,{className:`td-sleep-arrow`,children:`→`})]})]}),(0,x.jsxs)(`div`,{className:`td-basis`,children:[`睡眠依据：`,Qe.basis]})]}),(0,x.jsxs)(`section`,{className:`td-section td-more-section`,children:[(0,x.jsx)(`div`,{className:`td-section-head`,children:(0,x.jsx)(`h3`,{children:`更多工具`})}),(0,x.jsx)(`div`,{className:`td-more-grid`,children:[{icon:`📊`,label:`健康趋势`,tab:`trends`,desc:`30/90天趋势`},{icon:`📋`,label:`周报`,tab:`weekly_report`,desc:`本周总结`},{icon:`💬`,label:`AI 管家`,tab:`hub`,desc:`私人助手`},{icon:`⚡`,label:`能量状态`,tab:`energy`,desc:`精力管理`},{icon:`📚`,label:`动作库`,tab:`library`,desc:`动作教学`},{icon:`⏱️`,label:`训练历史`,tab:`history`,desc:`过往记录`},{icon:`🩺`,label:`图片咨询`,tab:`image`,desc:`AI 分析`},{icon:`⚙️`,label:`设置`,tab:`settings`,desc:`偏好配置`}].map(t=>(0,x.jsxs)(`button`,{className:`td-more-chip`,onClick:()=>e?.(t.tab),children:[(0,x.jsx)(`span`,{className:`td-m-icon`,children:t.icon}),(0,x.jsx)(`span`,{className:`td-m-label`,children:t.label}),(0,x.jsx)(`span`,{className:`td-m-desc`,children:t.desc})]},t.tab))})]}),(0,x.jsx)(`div`,{style:{height:`120px`}}),(0,x.jsx)(`style`,{children:`
.today-dashboard {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 16px 80px;
  font-family: -apple-system, "SF Pro Text", "PingFang SC", sans-serif;
  color: var(--ink, #ECE7D8);
  background: var(--bg, #0A0A0B);
  min-height: 100vh;
}
.td-toast {
  position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, #D4AF37, #B8860B);
  color: #0A0A0B; padding: 10px 24px; border-radius: 20px;
  font-size: 14px; font-weight: 700; z-index: 9999;
  animation: tdToastIn .3s ease, tdToastOut .3s ease 1.9s forwards;
  box-shadow: 0 4px 20px rgba(212,175,55,.35);
}
@keyframes tdToastIn { from{opacity:0;top:50px} to{opacity:1;top:60px} }
@keyframes tdToastOut { from{opacity:1} to{opacity:0;top:50px} }

.td-header { margin-bottom: 20px; }
.td-header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.td-date { font-size: 18px; font-weight: 800; color: var(--gold, #D4AF37); }
.td-login-hint {
  font-size: 12px; color: var(--muted, #9a958a);
  background: rgba(212,175,55,.08); border: 1px solid rgba(212,175,55,.15);
  padding: 4px 12px; border-radius: 12px; cursor: pointer; transition: all .2s;
}
.td-login-hint:hover { background: rgba(212,175,55,.15); color: var(--gold); }

.td-solar-card {
  background: linear-gradient(145deg, rgba(212,175,55,.07), rgba(212,175,55,.03));
  border: 1px solid rgba(212,175,55,.18); border-radius: 16px;
  padding: 18px 20px; position: relative; overflow: hidden;
}
.td-solar-card::before {
  content: ""; position: absolute; top: -30px; right: -30px;
  width: 100px; height: 100px;
  background: radial-gradient(circle, rgba(212,175,55,.12), transparent 70%); pointer-events: none;
}
.td-solar-left { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.td-solar-name { font-size: 28px; font-weight: 900; color: var(--gold, #D4AF37); letter-spacing: 2px; }
.td-solar-countdown { font-size: 13px; color: var(--muted, #9a958a); }
.td-solar-right { display: flex; flex-direction: column; gap: 8px; }
.td-solar-tcm { display: flex; gap: 8px; font-size: 13px; flex-wrap: wrap; }
.td-solar-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
  color: var(--gold, #D4AF37); opacity: .8; white-space: nowrap;
}
.td-solar-tcm span:last-child { color: var(--ink); }
.td-solar-row { display: flex; gap: 20px; flex-wrap: wrap; }
.td-solar-item { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.td-solar-item span:last-child { color: var(--ink); }

.td-section { margin-bottom: 24px; }
.td-section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.td-section-head h3 { font-size: 17px; font-weight: 800; color: var(--ink); margin: 0; }

/* 依据小标注 */
.td-basis {
  font-size: 11px; color: var(--muted, #9a958a); margin-top: 8px;
  padding-left: 2px; opacity: .85; line-height: 1.4;
}
.td-basis::before { content: "📖 "; opacity: .7; }

.td-change-btn {
  font-size: 12px; color: var(--gold); background: none;
  border: 1px solid rgba(212,175,55,.25); padding: 3px 12px; border-radius: 10px; cursor: pointer; transition: all .2s;
}
.td-change-btn:hover { background: rgba(212,175,55,.1); }
.td-energy-selected {
  display: flex; align-items: center; gap: 14px; padding: 16px 18px;
  background: rgba(255,255,255,.03); border-radius: 14px; border-left: 4px solid;
}
.td-energy-emoji { font-size: 32px; }
.td-energy-label { font-size: 18px; font-weight: 800; }
.td-energy-desc { font-size: 13px; color: var(--muted); margin-top: 2px; }
.td-energy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.td-energy-chip {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 10px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px; cursor: pointer; transition: all .2s; text-align: center;
}
.td-energy-chip.active { background: rgba(212,175,55,.08); border-width: 2px; }
.td-energy-chip:hover { background: rgba(255,255,255,.06); }
.td-e-emoji { font-size: 26px; }
.td-e-label { font-size: 14px; font-weight: 700; }
.td-e-desc { font-size: 11px; color: var(--muted); line-height: 1.3; }

.td-tips-bar {
  display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 10px 14px;
  background: rgba(212,175,55,.06); border-radius: 10px; font-size: 13px; color: var(--muted);
}
.td-tips-icon { font-size: 16px; }

.td-water-stat { font-size: 13px; color: var(--muted); position: relative; padding: 2px 0 4px; }
.td-water-pct {
  position: absolute; bottom: 0; left: 0; height: 2px;
  background: linear-gradient(90deg, #4AAEE0, #D4AF37); border-radius: 1px; transition: width .5s ease;
}
.td-cups-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 4px; }
.td-cup {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px;
  border-radius: 12px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
  cursor: pointer; transition: all .25s; user-select: none;
}
.td-cup:hover:not(.filled) { background: rgba(74,174,224,.08); border-color: rgba(74,174,224,.2); }
.td-cup.filled { background: rgba(74,174,224,.12); border-color: rgba(74,174,224,.3); }
.td-cup-svg { width: 36px; height: 40px; overflow: visible; }
.td-cup-outline { fill: none; stroke: rgba(255,255,255,.15); stroke-width: 2; transition: fill .3s; }
.td-cup-fill { fill: #4AAEE0; filter: drop-shadow(0 0 6px rgba(74,174,224,.4)); }
.td-cup-num { font-size: 10px; color: var(--muted); font-weight: 600; }
.td-cup.filled .td-cup-num { color: #4AAEE0; }
.td-cup-pop { animation: tdCupPop .45s cubic-bezier(.175,.885,.32,1.275); }
@keyframes tdCupPop {
  0%{transform:scale(1)} 30%{transform:scale(1.25) translateY(-4px)}
  60%{transform:scale(.95) translateY(1px)} 100%{transform:scale(1) translateY(0)}
}
.td-undo-btn {
  font-size: 12px; color: var(--muted); background: none; border: none;
  cursor: pointer; text-decoration: underline; padding: 4px 0; margin-top: 4px;
}
.td-undo-btn:hover { color: var(--ink); }
.td-water-celebration {
  text-align: center; padding: 12px; margin-top: 8px;
  background: linear-gradient(135deg, rgba(212,175,55,.1), rgba(74,174,224,.08));
  border-radius: 12px; font-size: 14px; font-weight: 700; color: var(--gold);
  animation: tdCelebrate .6s ease;
}
@keyframes tdCelebrate { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }

.td-cal-total { font-size: 14px; font-weight: 800; color: var(--gold); }

/* 热量目标卡 */
.td-cal-goal-card {
  background: rgba(255,255,255,.03); border: 1px solid rgba(212,175,55,.12);
  border-radius: 14px; padding: 14px 16px; margin-bottom: 12px;
}
.td-cal-metrics { display: flex; justify-content: space-between; gap: 8px; }
.td-cal-metric { display: flex; flex-direction: column; align-items: center; flex: 1; padding: 6px; border-radius: 10px; }
.td-cal-metric.highlight { background: rgba(212,175,55,.1); }
.td-cal-val { font-size: 20px; font-weight: 900; color: var(--ink); }
.td-cal-metric.highlight .td-cal-val { color: var(--gold); }
.td-cal-lbl { font-size: 10px; color: var(--muted); margin-top: 2px; text-align: center; }
.td-macro-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.td-macro {
  font-size: 12px; color: var(--ink); background: rgba(255,255,255,.04);
  padding: 4px 10px; border-radius: 8px;
}
.td-activity-btn {
  font-size: 11px; color: var(--gold); background: rgba(212,175,55,.08);
  border: 1px solid rgba(212,175,55,.2); padding: 4px 10px; border-radius: 8px;
  cursor: pointer; margin-left: auto;
}
.td-activity-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px; }
.td-activity-chip {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px; cursor: pointer; transition: all .15s;
}
.td-activity-chip.active { background: rgba(212,175,55,.1); border-color: rgba(212,175,55,.3); }
.td-a-label { font-size: 12px; font-weight: 700; color: var(--ink); }
.td-a-desc { font-size: 9px; color: var(--muted); }

.td-cal-incomplete {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 12px;
  background: rgba(212,175,55,.05); border: 1px dashed rgba(212,175,55,.2);
  border-radius: 12px; font-size: 12px; color: var(--muted);
}
.td-mini-btn {
  font-size: 12px; color: var(--gold); background: rgba(212,175,55,.1);
  border: 1px solid rgba(212,175,55,.25); padding: 5px 12px; border-radius: 8px;
  cursor: pointer; white-space: nowrap;
}

.td-meal-list { margin-bottom: 12px; }
.td-meal-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: rgba(255,255,255,.02); border-radius: 10px; margin-bottom: 6px; font-size: 13px;
}
.td-meal-type {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  color: var(--gold); background: rgba(212,175,55,.1); padding: 2px 8px; border-radius: 6px; white-space: nowrap;
}
.td-meal-name { flex: 1; }
.td-meal-cal { font-weight: 700; color: var(--ink); min-width: 65px; text-align: right; }
.td-meal-time { font-size: 11px; color: var(--muted); min-width: 48px; text-align: right; }
.td-meal-del { font-size: 16px; color: var(--muted); background: none; border: none; cursor: pointer; padding: 0 4px; line-height: 1; }
.td-meal-del:hover { color: #E57373; }
.td-meal-summary {
  font-size: 13px; color: var(--muted); padding: 8px 14px; background: rgba(255,255,255,.02);
  border-radius: 8px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;
}
.td-goal-gap { color: var(--gold); font-weight: 600; }
.td-empty-state {
  text-align: center; padding: 20px; color: var(--muted); font-size: 14px;
  background: rgba(255,255,255,.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,.08);
}
.td-food-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.td-action-btn {
  font-size: 13px; padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.03); color: var(--ink); cursor: pointer; transition: all .2s;
}
.td-action-btn:hover { background: rgba(255,255,255,.07); }
.td-action-btn.primary {
  background: linear-gradient(135deg, rgba(212,175,55,.2), rgba(212,175,55,.1));
  border-color: rgba(212,175,55,.3); color: var(--gold); font-weight: 700;
}
.td-food-panel {
  margin-top: 12px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px; padding: 16px; animation: tdPanelIn .25s ease;
}
@keyframes tdPanelIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
.td-food-panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 700; font-size: 14px; }
.td-food-panel-head button { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; }
.td-food-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.td-food-chip {
  display: flex; justify-content: space-between; align-items: center; padding: 10px 12px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
  border-radius: 10px; cursor: pointer; transition: all .15s; font-size: 13px;
}
.td-food-chip:hover { background: rgba(212,175,55,.1); border-color: rgba(212,175,55,.2); }
.td-f-name { color: var(--ink); }
.td-f-cal { font-weight: 700; color: var(--gold); font-size: 12px; white-space: nowrap; }
.td-food-photo-hint {
  margin-top: 10px; font-size: 11px; color: var(--muted); text-align: center;
  padding: 8px; background: rgba(255,255,255,.02); border-radius: 8px; line-height: 1.4;
}

.td-steps-card {
  display: flex; justify-content: space-between; align-items: center; padding: 16px 18px;
  background: linear-gradient(145deg, rgba(74,174,224,.06), rgba(74,174,224,.02));
  border: 1px solid rgba(74,174,224,.15); border-radius: 14px;
}
.td-steps-left { display: flex; align-items: center; gap: 12px; }
.td-steps-icon { font-size: 28px; }
.td-steps-val { font-size: 28px; font-weight: 900; color: var(--ink); }
.td-steps-label { font-size: 12px; color: var(--muted); }
.td-steps-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.td-steps-ring { position: relative; width: 56px; height: 56px; }
.td-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.td-ring-bg { fill: none; stroke: rgba(255,255,255,.08); stroke-width: 6; }
.td-ring-fill { fill: none; stroke: #4AAEE0; stroke-width: 6; stroke-linecap: round; transition: stroke-dasharray .8s ease; filter: drop-shadow(0 0 4px rgba(74,174,224,.3)); }
.td-ring-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #4AAEE0; }
.td-steps-goal { font-size: 11px; color: var(--muted); }
.td-steps-empty { text-align: center; }
.td-steps-empty p { font-size: 13px; color: var(--muted); margin: 0 0 8px; }
.td-sync-btn {
  font-size: 12px; padding: 6px 14px; border-radius: 10px; background: rgba(212,175,55,.1);
  border: 1px solid rgba(212,175,55,.25); color: var(--gold); cursor: pointer;
}

.td-workout-row { display: flex; flex-direction: column; gap: 8px; }
.td-workout-card {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px; cursor: pointer; transition: all .2s; text-align: left; width: 100%;
  color: var(--ink); font-family: inherit;
}
.td-workout-card:hover { background: rgba(255,255,255,.06); border-color: rgba(212,175,55,.15); }
.td-w-icon { font-size: 24px; }
.td-w-label { font-size: 14px; font-weight: 700; flex: 1; }
.td-w-desc { font-size: 11px; color: var(--muted); flex: 1; }
.td-w-arrow { color: var(--gold); font-size: 16px; }

.td-sleep-target { font-size: 12px; color: var(--muted); }
.td-sleep-cards { display: flex; flex-direction: column; gap: 8px; }
.td-sleep-card {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px; cursor: pointer; transition: all .2s; text-align: left; width: 100%;
  color: var(--ink); font-family: inherit;
}
.td-sleep-card:hover { background: rgba(255,255,255,.06); }
.td-sleep-icon { font-size: 24px; }
.td-sleep-label { font-size: 14px; font-weight: 700; }
.td-sleep-desc { font-size: 11px; color: var(--muted); flex: 1; }
.td-sleep-arrow { color: var(--gold); font-size: 16px; margin-left: auto; }

.td-more-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.td-more-chip {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05);
  border-radius: 12px; cursor: pointer; transition: all .15s; text-align: center;
  color: var(--ink); font-family: inherit;
}
.td-more-chip:hover { background: rgba(255,255,255,.06); border-color: rgba(212,175,55,.12); }
.td-m-icon { font-size: 22px; }
.td-m-label { font-size: 12px; font-weight: 700; }
.td-m-desc { font-size: 10px; color: var(--muted); text-align: center; }

@media (max-width: 400px) {
  .td-solar-name { font-size: 24px; }
  .td-energy-grid { grid-template-columns: 1fr; }
  .td-food-grid { grid-template-columns: 1fr 1fr; }
}
      `})]})}export{ye as default};