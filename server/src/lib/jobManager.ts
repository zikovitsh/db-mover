import { EventEmitter } from 'events';

export interface JobStats {
  collections: number;
  documents: number;
  totalDocuments?: number;
}

export interface Job {
  id: string;
  type: 'copy' | 'download';
  status: 'pending' | 'running' | 'completed' | 'failed';
  logs: string[];
  stats: JobStats;
  progress: number;
  error?: string;
  emitter: EventEmitter;
}

const jobs = new Map<string, Job>();

export const createJob = (type: 'copy' | 'download'): Job => {
  const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const job: Job = {
    id,
    type,
    status: 'pending',
    logs: [],
    stats: { collections: 0, documents: 0 },
    progress: 0,
    emitter: new EventEmitter(),
  };
  jobs.set(id, job);
  return job;
};

export const getJob = (id: string) => jobs.get(id);

export const updateJob = (id: string, updates: Partial<Job>) => {
  const job = jobs.get(id);
  if (!job) return;
  
  Object.assign(job, updates);
  
  if (updates.logs) {
     // Emit log event if logs were updated (not actually needed if we poll/stream the whole log array, but good for streams)
     // Actually, we usually append logs.
  }
  
  job.emitter.emit('update', job);
};

export const addLog = (id: string, message: string) => {
  const job = jobs.get(id);
  if (!job) return;
  job.logs.push(message);
  job.emitter.emit('log', message);
  job.emitter.emit('update', job);
};

// Cleanup old jobs periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    // 1 hour retention
    if (['completed', 'failed'].includes(job.status) && parseInt(id.split('_')[1]) < now - 3600000) {
      jobs.delete(id);
    }
  }
}, 60000);
