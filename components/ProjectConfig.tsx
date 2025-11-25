import React, { useRef, useState } from 'react';
import { Project, Part, Resource } from '../types';
import { Plus, Calendar, FileText, Upload, Trash2, Loader2, CheckCircle2, AlertCircle, Eye, ImageIcon, AlertTriangle } from 'lucide-react';
import { analyzePartDrawing } from '../services/geminiService';

interface ProjectConfigProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  resources: Resource[];
}

const ProjectConfig: React.FC<ProjectConfigProps> = ({ projects, setProjects, resources }) => {
  const [analyzingPartId, setAnalyzingPartId] = useState<string | null>(null);

  // Generate a random pleasant color
  const getRandomColor = () => {
    const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#2563eb', '#dc2626'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const addProject = () => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: `项目 #${projects.length + 1}`,
      deadline: new Date().toISOString().split('T')[0],
      color: getRandomColor(),
      parts: []
    };
    setProjects([...projects, newProject]);
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const updateProject = (id: string, field: keyof Project, value: any) => {
    setProjects(projects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleFileUpload = async (projectId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Limit to 100 files
    const fileList = Array.from(files).slice(0, 100);

    // Helper to read file as base64
    const readFileAsBase64 = (file: File): Promise<{base64: string, name: string, type: string}> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve({
            base64: res.split(',')[1],
            name: file.name.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, ''),
            type: file.type
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    // Read all files
    const loadedFiles = await Promise.all(fileList.map(readFileAsBase64));
      
    const newParts: Part[] = loadedFiles.map(fileData => ({
      id: crypto.randomUUID(),
      projectId,
      name: fileData.name,
      fileData: fileData.base64,
      mimeType: fileData.type,
      analysisStatus: 'pending',
      steps: []
    }));

    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, parts: [...p.parts, ...newParts] } : p
    ));

    // Trigger analysis for each new part
    newParts.forEach(part => {
      analyzePart(projectId, part.id, part.fileData!, part.mimeType);
    });

    // Reset input
    event.target.value = '';
  };

  const analyzePart = async (projectId: string, partId: string, base64: string, mime: string) => {
    setAnalyzingPartId(partId);
    updatePartStatus(projectId, partId, 'analyzing');

    try {
      const analysis = await analyzePartDrawing(base64, mime, resources);
      
      // Perform Capability Pre-check
      const availableTypes = new Set(resources.map(r => r.type));
      const warnings: string[] = [];
      
      analysis.steps.forEach(step => {
        if (!availableTypes.has(step.processType) && step.processType !== '其他') {
            if (!warnings.includes(step.processType)) {
                warnings.push(step.processType);
            }
        }
      });

      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          parts: p.parts.map(part => {
            if (part.id !== partId) return part;
            return {
              ...part,
              name: analysis.name, // Update name from AI
              analysisStatus: 'done',
              warnings: warnings,
              steps: analysis.steps.map((s, idx) => ({
                stepId: crypto.randomUUID(),
                order: idx + 1,
                ...s
              }) as any)
            };
          })
        };
      }));
    } catch (e) {
      console.error(e);
      updatePartStatus(projectId, partId, 'error');
    } finally {
      setAnalyzingPartId(null);
    }
  };

  const updatePartStatus = (projectId: string, partId: string, status: Part['analysisStatus']) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? {
        ...p,
        parts: p.parts.map(part => part.id === partId ? { ...part, analysisStatus: status } : part)
      } : p
    ));
  };

  const removePart = (projectId: string, partId: string) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, parts: p.parts.filter(part => part.id !== partId) } : p
    ));
  };

  const getStatusText = (part: Part) => {
    switch(part.analysisStatus) {
      case 'analyzing': return 'AI 正在分析图纸...';
      case 'done': 
        if (part.warnings && part.warnings.length > 0) return '分析完成 (存在产能警告)';
        return '分析完成';
      case 'error': return '分析失败';
      default: return '等待分析...';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            项目与零件管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">创建项目并上传零件图纸（PDF 或 图片）以进行 AI 自动化分析。</p>
        </div>
        <button 
          onClick={addProject}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> 新建项目
        </button>
      </div>

      <div className="grid gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ borderLeft: `4px solid ${project.color}` }}>
            {/* Project Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap md:flex-nowrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                {/* Color Picker */}
                <div className="flex flex-col items-center">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1">颜色</label>
                    <input 
                        type="color" 
                        value={project.color}
                        onChange={(e) => updateProject(project.id, 'color', e.target.value)}
                        className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                        title="选择项目颜色"
                    />
                </div>

                <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">项目名称</label>
                    <input 
                    type="text" 
                    value={project.name}
                    onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                    className="w-full bg-transparent font-bold text-lg text-slate-800 focus:outline-none border-b border-transparent focus:border-indigo-300 hover:border-slate-300 transition-colors"
                    />
                </div>
              </div>
              
              <div className="w-40">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> 最晚交付日期
                </label>
                <input 
                  type="date" 
                  value={project.deadline}
                  onChange={(e) => updateProject(project.id, 'deadline', e.target.value)}
                  style={{ colorScheme: 'light' }}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm mt-1 text-black font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button onClick={() => removeProject(project.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Parts List */}
            <div className="p-4">
              <div className="space-y-4">
                {project.parts.map((part) => (
                  <div key={part.id} className={`flex flex-col md:flex-row gap-4 p-3 rounded-lg border transition-colors bg-white shadow-sm ${part.warnings && part.warnings.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-100 hover:border-indigo-100'}`}>
                    {/* Thumbnail Section - Enlarged */}
                    <div className="flex-shrink-0 w-24 h-24 bg-white rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative group shadow-inner">
                        {part.mimeType.startsWith('image/') && part.fileData ? (
                            <img 
                                src={`data:${part.mimeType};base64,${part.fileData}`} 
                                alt={part.name}
                                className="w-full h-full object-contain p-1"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <FileText className="w-8 h-8 mb-1" />
                                <span className="text-[10px] uppercase font-bold text-slate-300">PDF</span>
                            </div>
                        )}
                        
                        {/* Preview Overlay */}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <a 
                                href={`data:${part.mimeType};base64,${part.fileData}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-white hover:text-indigo-200 flex flex-col items-center"
                                title="查看原图"
                             >
                                 <Eye className="w-6 h-6" />
                                 <span className="text-xs mt-1 font-medium">查看</span>
                             </a>
                         </div>
                    </div>

                    {/* Part Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-lg text-slate-800 truncate pr-2" title={part.name}>
                                {part.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                                {part.analysisStatus === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                                {part.analysisStatus === 'analyzing' && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
                                {part.analysisStatus === 'done' && !part.warnings?.length && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {part.analysisStatus === 'done' && part.warnings && part.warnings.length > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                {part.analysisStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                <span className={`text-xs font-medium ${part.warnings && part.warnings.length > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                                    {getStatusText(part)}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => removePart(project.id, part.id)} className="text-slate-300 hover:text-red-400 flex-shrink-0 p-1">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Warnings Alert */}
                      {part.warnings && part.warnings.length > 0 && (
                          <div className="mt-2 p-2 bg-amber-100 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2 animate-pulse">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <div>
                                  <strong>图纸预检报警：</strong> 发现车间缺少以下加工能力，可能会影响生产：
                                  <span className="font-bold ml-1">{part.warnings.join(', ')}</span>
                              </div>
                          </div>
                      )}

                      {/* Steps Visualization */}
                      {part.analysisStatus === 'done' && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {part.steps.map((step) => {
                             const isMissing = part.warnings?.includes(step.processType);
                             return (
                                <span 
                                    key={step.stepId} 
                                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                                        isMissing 
                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                    }`}
                                >
                                {step.order}. {step.processType} ({step.estimatedHours}h)
                                </span>
                             );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Area */}
              <div className="mt-4">
                <label className="flex items-center justify-center w-full h-12 px-4 transition bg-white border-2 border-slate-200 border-dashed rounded-lg appearance-none cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none group">
                  <span className="flex items-center space-x-2 group-hover:text-indigo-600">
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                    <span className="font-medium text-slate-500 text-sm">批量上传图纸 (支持 PDF, PNG, JPG, Ctrl/Shift多选, 最多100张)</span>
                  </span>
                  <input 
                    type="file" 
                    name="file_upload" 
                    className="hidden" 
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    multiple
                    onChange={(e) => handleFileUpload(project.id, e)}
                  />
                </label>
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            暂无进行中的项目。请创建一个新项目开始。
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectConfig;