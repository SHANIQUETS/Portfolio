import { Card } from "./card";
import { cn } from "@/lib/utils";

interface CardStatProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  linkUrl: string;
  linkText: string;
  color: string;
}

export default function CardStat({
  title,
  value,
  icon,
  linkUrl,
  linkText,
  color
}: CardStatProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", color)}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-300 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-neutral-900 dark:text-white">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-neutral-50 dark:bg-neutral-600 px-5 py-3">
        <div className="text-sm">
          <a href={linkUrl} className="font-medium text-primary hover:text-primary-light">
            {linkText}
          </a>
        </div>
      </div>
    </Card>
  );
}
