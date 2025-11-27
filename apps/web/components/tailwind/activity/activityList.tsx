import React from 'react';
import CreateActionLog from './createActivity';
import UpdateActionLog from './updateActivity';
import DeleteActionLog from './deleteActivity';
import ShareActionLog from './shareActivity';
import { ActivityLog } from '../../../types/activityType';

interface ActivityListProps {
  logs: ActivityLog[];
}

const ActivityList: React.FC<ActivityListProps> = ({ logs }) => {
  const renderActionLog = (log: ActivityLog) => {
    switch (log.action) {
      case 'CREATE':
        return <CreateActionLog log={log} />;
      case 'UPDATE':
        return <UpdateActionLog log={log} />;
      case 'DELETE':
        return <DeleteActionLog log={log} />;
      case 'SHARE':
        return <ShareActionLog log={log} />;
      // case 'MENTION':
      //   return <MentionActionLog log={log} />;
      default:
        return (
          <div className="flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-[rgb(39,39,42)] rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{log.userName}</span>
                <span className="text-gray-600"> performed action </span>
                <span className="font-semibold">{log.action}</span>
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log._id}>{renderActionLog(log)}</div>
      ))}
    </div>
  );
};

export default ActivityList;
