import { api } from "~/trpc/server";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { DailyStreak } from "~/app/dashboard/components/daily-streak";
import { Topics } from "~/app/dashboard/components/topics";
import { Assessments } from "~/app/dashboard/components/assessments";
import { Questions } from "~/app/dashboard/components/questions";


export default async function Dashboard() {
    const topics = await api.topic.getAll();

    return (
        <>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <DailyStreak />
                <Topics topics={topics} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Assessments />
                <Questions />
            </div>
                </div>
        </>
    )
}