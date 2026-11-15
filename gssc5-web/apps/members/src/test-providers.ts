import { provideBrowserGlobalErrorListeners } from "@angular/core";
import { provideRouter } from "@angular/router";

// Global Angular providers for every members unit test.
export default [provideBrowserGlobalErrorListeners(), provideRouter([])];
