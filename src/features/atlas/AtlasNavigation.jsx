import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAtlasContext } from './AtlasContext';
import { atlasHref } from './navigation';

export function AtlasLink({to,...props}) {
  const context=useAtlasContext();
  return <Link {...props} to={atlasHref(to,context)}/>;
}
export function AtlasNavLink({to,...props}) {
  const context=useAtlasContext();
  return <NavLink {...props} to={atlasHref(to,context)}/>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAtlasNavigate() {
  const navigate=useNavigate(),context=useAtlasContext();
  return (to,options)=>navigate(typeof to==='number'?to:atlasHref(to,context),options);
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAtlasSearchParams() {
  const [params,setParams]=useSearchParams();
  const context=useAtlasContext();
  return [params,(next,options)=>{
    const result=new URLSearchParams(typeof next==='function'?next(params):next);
    if(context.region)result.set('region',context.region);
    result.set('layer',context.layer);
    setParams(result,options);
  }];
}
