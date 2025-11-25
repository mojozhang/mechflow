import React from 'react';
import { Resource, ProcessingType } from '../types';
import { Plus, Trash2, Wrench } from 'lucide-react';

interface ResourceConfigProps {
  resources: Resource[];
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
}

const ResourceConfig: React.FC<ResourceConfigProps> = ({ resources, setResources }) => {
  
  const addResource = () => {
    const newResource: Resource = {
      id: crypto.randomUUID(),
      type: ProcessingType.Lathe,
      name: '',
      count: 1
    };
    setResources([...resources, newResource]);
  };

  const removeResource = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
  };

  const updateResource = (id: string, field: keyof Resource, value: any) => {
    setResources(resources.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            车间产能设置
          </h2>
          <p className="text-sm text-slate-500 mt-1">定义工厂可用的机器设备和技术工人。</p>
        </div>
        <button 
          onClick={addResource}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> 添加资源
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <div key={resource.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide">
                {resource.type}
              </span>
              <button onClick={() => removeResource(resource.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">资源类型</label>
                <select 
                  className="w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={resource.type}
                  onChange={(e) => updateResource(resource.id, 'type', e.target.value)}
                >
                  {Object.values(ProcessingType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">名称 / 编号</label>
                <input 
                  type="text" 
                  value={resource.name}
                  onChange={(e) => updateResource(resource.id, 'name', e.target.value)}
                  placeholder="例如：数控车床A组"
                  className="w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">可用数量</label>
                <input 
                  type="number" 
                  min="1"
                  value={resource.count}
                  onChange={(e) => updateResource(resource.id, 'count', parseInt(e.target.value))}
                  className="w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {resources.length === 0 && (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
          暂无资源定义。请添加机器或人员以开始。
        </div>
      )}
    </div>
  );
};

export default ResourceConfig;