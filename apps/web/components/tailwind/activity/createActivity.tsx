import { Plus } from 'lucide-react';
import { ActivityLog } from '../../../types/activityType';

interface CreateActionLogProps {
  log: ActivityLog;
}

const CreateActionLog: React.FC<CreateActionLogProps> = ({ log }) => {

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-[rgb(39,39,42)] rounded-lg transition-colors">

      {/* Action Icon */}
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300  dark:border-gray-600 flex items-center justify-center">
        <Plus className="w-4 h-4 text-gray-500 dark:text-gray-500" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex-1 gap-2">
          <div className="flex  justify-between gap-2 min-w-0">
            <div className='text-sm font-medium text-gray-600 dark:text-gray-200'>{log.userName}</div>

            {/* Timestamp */}
            <div className="text-[11px] text-gray-500">
              {new Date(log.timestamp).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
          
          <div className='mt-1 ml-1 text-sm text-gray-700 dark:text-gray-300'>
            <p className="m-0 text-sm text-gray-900">
              <p className="m-0 inline text-gray-600 dark:text-gray-300"> created {log.field} </p>
              <p className="m-0 inline text-sm font-semibold text-gray-500 dark:text-gray-400">{log.noteName || 'untitled'}</p>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateActionLog;
