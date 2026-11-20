import { load } from '@std/dotenv';
import { type AppConfig, getAppConfig } from '@/config/app-config.ts';
import { getSupabaseAdminClient } from '@/config/supabase.ts';
import { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { sendSummary, type SendSummaryDeps } from '@/usecases/sendSummary.ts';
import { runJob } from './runJob.ts';

export function createSendSummaryDeps(config: AppConfig): SendSummaryDeps {
  return {
    ticketRepository: new TicketRepository(getSupabaseAdminClient()),
    lineClient: new LineClient(config.line),
  };
}

if (import.meta.main) {
  await load({ export: true }).catch(() => ({}));
  const config = getAppConfig();
  Deno.exit(
    await runJob(
      { name: 'send-summary', ...config.cloudRunJob },
      () => sendSummary(createSendSummaryDeps(config)),
    ),
  );
}
