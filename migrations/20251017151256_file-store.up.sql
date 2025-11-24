-- Add up migration script here
create table if not exists file_store (
    id serial primary key,
    file_name varchar(255) not null,
    file_path varchar(1024) not null,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp,
    deleted_at timestamp null,
    embedding vector(1536)
);

create table if not exists chat_logs (
  id serial primary key,
  user_id varchar(255) not null,
  project_id varchar(255) not null,
  response_id varchar(255) not null,
  previous_response_id varchar(255) null,
  request_text text,
  response_text text,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  deleted_at timestamp null
);

create table if not exists action_logs (
  id serial primary key,
  action_type varchar(255) not null,
  user_id varchar(255) not null,
  session_id varchar(255) not null,
  details jsonb,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  deleted_at timestamp null
);