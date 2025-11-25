
import React from 'react';
import { ScheduleResult, Resource, Project, ScheduleTask } from '../types';
import { Calendar, Clock, CheckCircle2, Circle, ArrowRight, ArrowDown, ExternalLink } from 'lucide-react';

interface ScheduleViewProps {
  schedule: ScheduleResult | null;
  projects: Project[];
  resources: Resource[];
  isLoading: boolean;
  onGenerate: () => void;
  canGenerate: boolean;
  onTaskToggle: (taskId: string) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, projects, resources, isLoading, onGenerate, canGenerate, onTaskToggle }) => {
  
  if (!schedule && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
        <Calendar className="w-16 h-16 text-indigo-100 mb-4" />
        <h3 className="text-lg font-medium text-slate-800">尚未生成排产计划</h3>
        <p className="text-slate-500 mb-6 text-center max-w-md">
          在定义资源并添加包含已分析零件的项目后，点击下方按钮让 AI 优化生产流程。
        </p>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
            canGenerate 
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5' 
              : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          生成优化排产计划
        </button>
        {!canGenerate && (
          <p className="text-xs text-red-400 mt-2">
            请至少添加一个资源和一个包含已分析零件的项目。
          </p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <h3 className="text-lg font-medium text-slate-800">AI 正在规划生产...</h3>
        <p className="text-slate-500">正在平衡机器负载和交付期限，并处理外发工序。</p>
      </div>
    );
  }

  // Group tasks logic
  const tasksByProject: { [key: string]: { project: Project | undefined, parts: { [key: string]: ScheduleTask[] } } } = {};

  schedule?.tasks.forEach(task => {
    if (!tasksByProject[task.projectId]) {
        const project = projects.find(p => p.id === task.projectId);
        tasksByProject[task.projectId] = {
            project: project,
            parts: {}
        };
    }
    
    if (!tasksByProject[task.projectId].parts[task.partId]) {
        tasksByProject[task.projectId].parts[task.partId] = [];
    }
    tasksByProject[task.projectId].parts[task.partId].push(task);
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">生产任务清单</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            <p className="text-sm text-slate-500">
                总预估周期: <span className="font-semibold text-indigo-600">{schedule?.totalDuration} 小时</span>
            </p>
            <p className="text-sm text-slate-500 italic border-l pl-4 border-slate-300">
               "{schedule?.explanation}"
            </p>
          </div>
        </div>
        
        <button
          onClick={onGenerate}
          className="flex-shrink-0 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm"
        >
          重新规划
        </button>
      </div>
      
      {/* Task List grouped by Project -> Part */}
      <div className="space-y-8">
        {Object.entries(tasksByProject).map(([projectId, { project, parts }]) => (
            <div key={projectId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Project Header */}
                <div 
                    className="p-4 border-b border-slate-200 flex justify-between items-center"
                    style={{ borderLeft: `6px solid ${project?.color || '#cbd5e1'}` }}
                >
                    <h3 className="font-bold text-lg text-slate-800">{project?.name || '未知项目'}</h3>
                    <span className="text-xs text-slate-500">截止: {project?.deadline}</span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(parts).map(([partId, partTasks]) => {
                        // Sort tasks by start time
                        const sortedTasks = partTasks.sort((a, b) => a.startTime - b.startTime);
                        const partName = sortedTasks[0]?.partName || '未知零件';

                        return (
                            <div key={partId} className="border border-slate-100 rounded-lg bg-slate-50/50 p-4 hover:shadow-md transition-shadow">
                                <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
                                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                    {partName}
                                </h4>
                                
                                <div className="space-y-0 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-slate-200 z-0"></div>

                                    {sortedTasks.map((task, index) => {
                                        const isOutsourced = task.resourceId === 'OUTSOURCE' || task.resourceName.includes('外发');
                                        
                                        return (
                                          <div key={task.taskId} className="relative z-10 flex items-start group mb-4 last:mb-0">
                                              {/* Sequence Number / Dot */}
                                              <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold mr-3 mt-1 transition-colors ${
                                                  task.completed 
                                                  ? 'bg-green-100 border-green-500 text-green-700' 
                                                  : isOutsourced
                                                    ? 'bg-amber-100 border-amber-500 text-amber-700'
                                                    : 'bg-white border-slate-300 text-slate-500'
                                              }`}>
                                                  {index + 1}
                                              </div>

                                              {/* Card */}
                                              <div className={`flex-1 rounded-lg border p-3 transition-all cursor-pointer ${
                                                  task.completed 
                                                  ? 'bg-green-50 border-green-200' 
                                                  : isOutsourced
                                                    ? 'bg-amber-50 border-amber-200 hover:border-amber-400'
                                                    : 'bg-white border-slate-200 hover:border-indigo-300'
                                              }`}
                                              onClick={() => onTaskToggle(task.taskId)}
                                              >
                                                  <div className="flex justify-between items-start">
                                                      <div>
                                                          <div className="flex items-center gap-2 mb-1">
                                                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                                                  task.completed 
                                                                  ? 'bg-green-200 text-green-800' 
                                                                  : isOutsourced
                                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                    : 'bg-indigo-100 text-indigo-800'
                                                              }`}>
                                                                  {isOutsourced && <ExternalLink className="w-3 h-3" />}
                                                                  {task.resourceName}
                                                              </span>
                                                              <span className="text-xs text-slate-400 font-mono">
                                                                  {task.duration}h
                                                              </span>
                                                          </div>
                                                          <p className={`text-sm font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                              {task.description}
                                                          </p>
                                                          {isOutsourced && !task.completed && (
                                                            <p className="text-[10px] text-amber-600 mt-1 font-medium">
                                                              * 此工序需外发加工
                                                            </p>
                                                          )}
                                                      </div>

                                                      <div className="ml-3 flex-shrink-0 text-slate-300">
                                                          {task.completed ? (
                                                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                                                          ) : (
                                                              <Circle className={`w-6 h-6 ${isOutsourced ? 'group-hover:text-amber-400' : 'group-hover:text-indigo-400'}`} />
                                                          )}
                                                      </div>
                                                  </div>

                                                  {task.completed && task.completedAt && (
                                                      <div className="mt-2 text-[10px] text-green-700 font-medium text-right border-t border-green-100 pt-1">
                                                          完成于: {task.completedAt}
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleView;
