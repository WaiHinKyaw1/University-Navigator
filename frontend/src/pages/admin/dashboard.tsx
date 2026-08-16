import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  getGetAnalyticsOverviewQueryKey,
  getGetMajorDistributionQueryKey,
  getGetRegistrationTrendQueryKey,
  useGetAnalyticsOverview,
  useGetMajorDistribution,
  useGetRegistrationTrend,
} from "@workspace/api-client-react";
import { Users, Building2, BookOpen, MessageSquare, Heart, UserPlus, ShieldCheck, CalendarDays, TrendingUp } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, Cell 
} from "recharts";

const COLORS = ['hsl(161, 80%, 25%)', 'hsl(45, 93%, 47%)', 'hsl(220, 70%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 60%, 60%)', 'hsl(20, 80%, 60%)'];

function CircleLoading({ label = "Loading database data" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border bg-background shadow-sm">
        <div className="absolute inset-1 rounded-full border border-primary/15" />
        <Spinner className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const baseQueryOptions = {
    staleTime: 0,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: true,
  };
  const { data: overview, isLoading: isOverviewLoading } = useGetAnalyticsOverview({
    query: { ...baseQueryOptions, queryKey: getGetAnalyticsOverviewQueryKey() },
  });
  const { data: majorDistribution, isLoading: isMajorDistributionLoading } = useGetMajorDistribution({
    query: { ...baseQueryOptions, queryKey: getGetMajorDistributionQueryKey() },
  });
  const { data: regTrend, isLoading: isRegTrendLoading } = useGetRegistrationTrend({
    query: { ...baseQueryOptions, queryKey: getGetRegistrationTrendQueryKey() },
  });

  const StatCard = ({ title, value, icon: Icon, desc, isLoading }: { title: string, value: string | number, icon: any, desc?: string, isLoading?: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-8 items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
              <Spinner className="h-5 w-5 text-primary" />
            </div>
          </div>
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Live overview from the current database.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={overview?.totalUsers || 0} icon={Users} desc={`${overview?.activeUsers || 0} active, ${overview?.bannedUsers || 0} banned`} isLoading={isOverviewLoading} />
          <StatCard title="Universities" value={overview?.totalUniversities || 0} icon={Building2} isLoading={isOverviewLoading} />
          <StatCard title="Majors" value={overview?.totalMajors || 0} icon={BookOpen} isLoading={isOverviewLoading} />
          <StatCard title="Chat Messages" value={overview?.totalMessages || 0} icon={MessageSquare} desc="Peer and direct student chat" isLoading={isOverviewLoading} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Recent Registrations (7 days)"
            value={overview?.recentRegistrations ?? 0}
            icon={UserPlus}
            desc="New users in the last 7 days"
            isLoading={isOverviewLoading}
          />
          <StatCard
            title="Saved Favorites"
            value={overview?.totalFavorites ?? 0}
            icon={Heart}
            desc="Universities saved by students"
            isLoading={isOverviewLoading}
          />
          <StatCard
            title="News Articles"
            value={overview?.totalNewsArticles || 0}
            icon={CalendarDays}
            desc="Published announcements"
            isLoading={isOverviewLoading}
          />
          <StatCard
            title="Banned Users"
            value={overview?.bannedUsers ?? 0}
            icon={ShieldCheck}
            desc="Accounts currently banned"
            isLoading={isOverviewLoading}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>User Registrations (12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isRegTrendLoading ? (
                  <CircleLoading />
                ) : regTrend && regTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={regTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Top Majors by University Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isMajorDistributionLoading ? (
                  <CircleLoading />
                ) : majorDistribution && majorDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={majorDistribution} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="majorName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        cursor={{ fill: 'hsl(var(--muted))' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        {majorDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
                <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Recent Users
            </CardTitle>
            {overview?.recentUsers && (
              <span className="text-xs text-muted-foreground">Last 5 registered</span>
            )}
          </CardHeader>
          <CardContent>
            {isOverviewLoading ? (
              <CircleLoading label="Loading recent users" />
            ) : overview?.recentUsers && overview.recentUsers.length > 0 ? (
              <div className="space-y-3">
                {overview.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={user.avatarUrl || "/default-avatar.png"}
                        alt={user.name}
                        className="h-9 w-9 rounded-full object-cover border"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${user.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {user.role}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${user.status === "banned" ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center py-6 text-muted-foreground">No recent users</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
