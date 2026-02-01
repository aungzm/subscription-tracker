import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-[120px]" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-[400px]" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[160px]" />
            <Skeleton className="h-4 w-[240px]" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-[120px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
