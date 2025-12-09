import type { NewApplicationForm } from "@/components/dialogs/AddApplicationDialog";

export type AppliedApplication = {
  id: string;
  website?: string;
} & NewApplicationForm;
