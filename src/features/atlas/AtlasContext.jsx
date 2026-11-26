import { createContext, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveAtlasContext } from './navigation';
const Context = createContext({region:null,layer:'unemployment'});

export default function AtlasProvider({children}) {
  const location=useLocation();
  const [memory,setMemory]=useState(()=>({...resolveAtlasContext(location.pathname,location.search),locationKey:location.key}));
  const context=resolveAtlasContext(location.pathname,location.search,memory);
  if(memory.locationKey!==location.key)setMemory({...context,locationKey:location.key});
  return <Context.Provider value={context}>{children}</Context.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAtlasContext() { return useContext(Context); }
