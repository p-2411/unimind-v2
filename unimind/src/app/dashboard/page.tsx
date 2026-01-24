import { SidebarTrigger } from "~/components/ui/sidebar";


export default function Dashboard() {

    return (
        <>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
            </div>
        <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min">
            {/* Main content area */}
            <div className="p-4">
                <h2 className="text-2xl font-bold">Welcome to Unimind</h2>
                <p className="mt-2 text-muted-foreground" />
            </div>
        </div>
        </div>
        </>
    )
}