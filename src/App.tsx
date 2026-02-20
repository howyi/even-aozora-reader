import { Text } from "./components/text";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import type { PageManager } from "./hud/page-manager";
import { SplashText } from "./hud/pages/splash-text";

function App({ manager }: { manager?: PageManager }) {
	return (
		<div className="flex flex-col h-dvh">
			<div className="flex flex-col px-3 bg-third-background p-2">
				<Input className="" placeholder="Search" />
			</div>
			<div className="flex-1 flex flex-col px-3 space-y-1.5 bg-fourth-background">
				<Text size="very-large-title" className="text-second-foreground">
					Reading
				</Text>
				<Button
					type="button"
					variant={"secondary"}
					onClick={() => manager?.load(new SplashText("push"))}
				>
					蟹工船3
				</Button>
			</div>
		</div>
	);
}

export default App;
