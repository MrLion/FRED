import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function Settings({ clearHistory }) {
  const [cleared,setCleared]=useState(false);
  return (
    <div className="page settings-page">
      <div className="page-intro"><span className="eyebrow">YOUR ATLAS</span><h1 className="page-title">Preferences & history</h1><p>Manage the places and indicators you have explored.</p></div>

      <div className="settings-list">
        <button className="settings-item" onClick={()=>{clearHistory();setCleared(true);}}>
          <Trash2 size={20} />
          <span>Clear recently viewed history</span>
        </button>
      </div>
      {cleared&&<p className="settings-feedback" role="status">Your recently viewed history has been cleared.</p>}
    </div>
  );
}
