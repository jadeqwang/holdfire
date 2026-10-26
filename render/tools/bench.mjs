import pkg from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pkg;
const html = `<!doctype html><html><body style="margin:0;background:#000"><canvas id=c width=1920 height=1080></canvas><script>
const c=document.getElementById('c');const gl=c.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false});
const vs='#version 300 es\\nin vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}';
const fs='#version 300 es\\nprecision highp float;in vec2 uv;out vec4 o;uniform float t;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}void main(){vec2 p=uv*6.;float a=0.,s=.5;for(int i=0;i<6;i++){a+=s*n(p+t*.1);p*=2.;s*=.5;}o=vec4(vec3(a*.8,a*.6,a*.3),1);}';
function sh(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(x);return x;}
const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
window.draw=(t)=>{gl.uniform1f(gl.getUniformLocation(pr,'t'),t);for(let k=0;k<4;k++)gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();return gl.getParameter(gl.RENDERER);};
</script></body></html>`;
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.setContent(html);
console.log(await p.evaluate(() => draw(0)));
let t0 = Date.now();
for (let i = 0; i < 10; i++) { await p.evaluate((t) => draw(t), i / 24); await p.locator('#c').screenshot({ type: 'png' }); }
console.log('4 fullscreen fbm passes + png capture, ms/frame:', (Date.now() - t0) / 10);
t0 = Date.now();
for (let i = 0; i < 10; i++) { await p.evaluate((t) => draw(t), i / 24); await p.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.95).length); }
console.log('draw + toDataURL jpeg, ms/frame:', (Date.now() - t0) / 10);
t0=Date.now(); for (let i=0;i<10;i++){ await p.evaluate((t)=>draw(t), i/24);} console.log("draw only ms/frame:", (Date.now()-t0)/10);
await b.close();
