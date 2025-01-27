import {Provider} from "@/components/ui/provider"
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Provider>
            <QueryClientProvider client={new QueryClient()}>
                <App/>
            </QueryClientProvider>
        </Provider>
    </React.StrictMode>,
)