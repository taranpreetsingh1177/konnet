-- Create replies table
create table public.replies (
    id uuid not null default gen_random_uuid(),
    lead_id uuid references public.leads(id) on delete set null,
    campaign_id uuid references public.campaigns(id) on delete set null,
    user_id uuid references auth.users(id) on delete cascade,
    thread_id text,
    gmail_message_id text unique,
    subject text,
    snippet text,
    body text,
    received_at timestamp with time zone default now(),
    is_read boolean default false,

    constraint replies_pkey primary key (id)
);

-- Enable RLS
alter table public.replies enable row level security;

-- Policies
create policy "Users can view their own replies"
    on public.replies for select
    using (auth.uid() = user_id);

create policy "Users can insert their own replies"
    on public.replies for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own replies"
    on public.replies for update
    using (auth.uid() = user_id);

create policy "Users can delete their own replies"
    on public.replies for delete
    using (auth.uid() = user_id);

-- Add index for faster lookups
create index replies_lead_id_idx on public.replies(lead_id);
create index replies_campaign_id_idx on public.replies(campaign_id);
create index replies_user_id_idx on public.replies(user_id);
create index replies_thread_id_idx on public.replies(thread_id);
