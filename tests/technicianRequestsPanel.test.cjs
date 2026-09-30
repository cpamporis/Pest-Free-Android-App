const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),babel=require('@babel/core');
test('technician photos open the shared viewer with the complete gallery and chosen index',()=>{
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:initial=>[initial,()=>{}]};
 const native=Object.fromEntries(['View','Text','TouchableOpacity','ScrollView'].map(n=>[n,n]));
 const deps={'react':React,'react-native':native,'@expo/vector-icons':{MaterialIcons:'Icon'},'../services/apiService':{getUploadedFileUrl:n=>'https://lab.test/uploads/'+n},'./ProtectedImage':'ProtectedImage','./CommercialEditor':'CommercialEditor','./ChargeableMaterials':{Action:'Action'}};
 const code=babel.transformSync(fs.readFileSync(path.join(__dirname,'../src/components/TechnicianRequestsPanel.js'),'utf8'),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-react-jsx'),require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:n=>{if(!(n in deps))throw Error(n);return deps[n];}});
 let opened;const images=['first.jpg','second.jpg'];
 const tree=module.exports.default({requests:[{id:'r',status:'pending',customer_name:'Customer',images},{id:'accepted',status:'accepted',images:['hidden.jpg']}],styles:{},onOpenImages:(...args)=>{opened=args;}});
 const walk=n=>Array.isArray(n)?n.flatMap(walk):n&&typeof n==='object'?[n,...walk(n.props.children)]:[];
 const buttons=walk(tree).filter(n=>n.type==='TouchableOpacity');assert.equal(buttons.length,2);
 buttons[1].props.onPress();assert.equal(opened[0],images);assert.equal(opened[1],1);
 assert.equal(walk(tree).filter(n=>n.type==='ProtectedImage').length,2,'private thumbnails retained');
});
