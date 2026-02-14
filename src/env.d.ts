import { TypedPocketBase } from "./pocketbase-types";
declare global {
  namespace App {
    interface Locals {
      pb: TypedPocketBase;
    }
  }

  interface Window {
    __previewData?: any;
    setGridStyles?: (count: number) => void;
    openModal?: (url: string) => void;
  }
}
