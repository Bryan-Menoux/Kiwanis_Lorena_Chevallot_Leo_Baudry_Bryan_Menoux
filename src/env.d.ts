import { TypedPocketBase } from "./pocketbase-types";
declare global {
  namespace App {
    interface Locals {
      pb: TypedPocketBase;
    }
  }

  interface Window {
    __previewData?: any;
    // The gallery script implements setGridStyles without parameters; keep type flexible.
    setGridStyles?: () => void;
    openModal?: (url: string) => void;
  }
}
