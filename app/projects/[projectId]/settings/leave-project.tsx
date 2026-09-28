"use client";

import { LogOut } from "lucide-react";
import { useActionState } from "react";

import { FormAlert } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { projectMessages } from "@/lib/projects/messages";

import { ConfirmAction } from "../../_components/confirm-action";
import { leaveProject, type LeaveState } from "./actions";

export function LeaveProject({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(leaveProject, { message: null } satisfies LeaveState);

  return (
    <div className="flex flex-col gap-md">
      <FormAlert message={state.message} />

      <ConfirmAction
        trigger={
          <Button variant="secondary">
            <LogOut aria-hidden="true" />
            Leave project
          </Button>
        }
        title={projectMessages.leaveTitle}
        description={projectMessages.leaveDescription}
        confirmLabel={projectMessages.leaveConfirm}
        fields={{ projectId }}
        action={formAction}
      />
    </div>
  );
}
