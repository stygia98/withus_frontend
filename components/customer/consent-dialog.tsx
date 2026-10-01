"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { CHANNEL_LABEL, type Channel, type Customer, type Yn } from "./types";

/**
 * 채널 수신동의 변경 (PRD 7장). 수신거부 목록에 있는 채널을 동의로 바꾸려면 증빙 메모가 필요하고,
 * 저장하면 수신거부 목록에서 해제된다 (CLAUDE.md 6장 10번)
 */
export function ConsentDialog({
  customer,
  channel,
  onOpenChange,
}: {
  customer: Customer;
  /** null 이면 닫힘 */
  channel: Channel | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const current: Yn | null =
    channel == null ? null : channel === "EMAIL" ? customer.emailConsent : customer.smsConsent;
  const target: Yn = current === "Y" ? "N" : "Y";
  const needsEvidence =
    channel != null && target === "Y" && customer.suppressedChannels.includes(channel);

  const change = useMutation({
    mutationFn: () =>
      api<Customer>(`/api/v1/customers/${customer.customerId}/consent`, {
        method: "PATCH",
        body: JSON.stringify({ channel, consent: target, evidenceNote: note.trim() || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success("수신동의를 변경했습니다.");
      close();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "변경하지 못했습니다."),
  });

  function close() {
    setNote("");
    onOpenChange(false);
  }

  return (
    <Dialog open={channel != null} onOpenChange={(open) => (open ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {channel && CHANNEL_LABEL[channel]} 수신동의를 {target === "Y" ? "동의" : "거부"}로 변경
          </DialogTitle>
          {needsEvidence && (
            <DialogDescription>
              수신거부 이력이 있는 채널입니다. 고객이 다시 동의했다는 증빙을 남겨야 변경되고,
              수신거부 목록에서 해제됩니다.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="evidenceNote">{needsEvidence ? "증빙 메모 *" : "메모"}</Label>
          <Textarea
            id="evidenceNote"
            maxLength={500}
            placeholder={needsEvidence ? "예: 2026-10-01 매장 방문 시 서면 재동의" : undefined}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => change.mutate()}
            disabled={change.isPending || (needsEvidence && note.trim() === "")}
          >
            변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
