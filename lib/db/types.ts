
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ai_calls": {
                  Row: {
                    "attempt": number,"cost_currency": string,"cost_micros": number,"created_at": string,"failure_detail": string | null,"failure_reason": string | null,"id": string,"input_tokens": number,"job_id": string,"latency_ms": number,"model": string,"outcome": string,"output_tokens": number,"page_id": string | null,"page_ref": string | null,"prompt_version": string,"request_id": string | null,"step": Database["public"]['Enums']["pipeline_step"],"stop_reason": string | null,"vendor": string
                  }
                  Insert: {
                    "attempt"?: number,"cost_currency"?: string,"cost_micros"?: number,"created_at"?: string,"failure_detail"?: string | null,"failure_reason"?: string | null,"id": string,"input_tokens"?: number,"job_id": string,"latency_ms"?: number,"model": string,"outcome": string,"output_tokens"?: number,"page_id"?: string | null,"page_ref"?: string | null,"prompt_version": string,"request_id"?: string | null,"step": Database["public"]['Enums']["pipeline_step"],"stop_reason"?: string | null,"vendor": string
                  }
                  Update: {
                    "attempt"?: number,"cost_currency"?: string,"cost_micros"?: number,"created_at"?: string,"failure_detail"?: string | null,"failure_reason"?: string | null,"id"?: string,"input_tokens"?: number,"job_id"?: string,"latency_ms"?: number,"model"?: string,"outcome"?: string,"output_tokens"?: number,"page_id"?: string | null,"page_ref"?: string | null,"prompt_version"?: string,"request_id"?: string | null,"step"?: Database["public"]['Enums']["pipeline_step"],"stop_reason"?: string | null,"vendor"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_calls_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "ai_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_calls_page_id_fkey"
      columns: ["page_id"]
isOneToOne: false
      referencedRelation: "record_pages"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_jobs": {
                  Row: {
                    "attempt": number,"cancelled_at": string | null,"cost_currency": string,"cost_micros": number,"created_at": string,"failure_page_id": string | null,"failure_reason": string | null,"finished_at": string | null,"id": string,"idempotency_key": string,"inngest_run_id": string | null,"input_tokens": number,"kind": Database["public"]['Enums']["ai_job_kind"],"output_tokens": number,"set_id": string | null,"started_at": string | null,"status": Database["public"]['Enums']["ai_job_status"],"step": Database["public"]['Enums']["pipeline_step"] | null,"steps": NonNullable<Json>,"updated_at": string
                  }
                  Insert: {
                    "attempt"?: number,"cancelled_at"?: string | null,"cost_currency": string,"cost_micros"?: number,"created_at"?: string,"failure_page_id"?: string | null,"failure_reason"?: string | null,"finished_at"?: string | null,"id"?: string,"idempotency_key": string,"inngest_run_id"?: string | null,"input_tokens"?: number,"kind"?: Database["public"]['Enums']["ai_job_kind"],"output_tokens"?: number,"set_id"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["ai_job_status"],"step"?: Database["public"]['Enums']["pipeline_step"] | null,"steps"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "attempt"?: number,"cancelled_at"?: string | null,"cost_currency"?: string,"cost_micros"?: number,"created_at"?: string,"failure_page_id"?: string | null,"failure_reason"?: string | null,"finished_at"?: string | null,"id"?: string,"idempotency_key"?: string,"inngest_run_id"?: string | null,"input_tokens"?: number,"kind"?: Database["public"]['Enums']["ai_job_kind"],"output_tokens"?: number,"set_id"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["ai_job_status"],"step"?: Database["public"]['Enums']["pipeline_step"] | null,"steps"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_jobs_failure_page_id_fkey"
      columns: ["failure_page_id"]
isOneToOne: false
      referencedRelation: "record_pages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_jobs_set_id_fkey"
      columns: ["set_id"]
isOneToOne: false
      referencedRelation: "record_sets"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_kind": Database["public"]['Enums']["audit_actor_kind"],"actor_system": string | null,"changes": NonNullable<Json>,"created_at": string,"details": NonNullable<Json>,"id": number,"note": Json | null,"request_id": string | null,"stripe_event_id": string | null,"target_id": string,"target_professional_id": string | null,"target_type": string,"verification": Json | null
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_kind": Database["public"]['Enums']["audit_actor_kind"],"actor_system"?: string | null,"changes"?: NonNullable<Json>,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"note"?: Json | null,"request_id"?: string | null,"stripe_event_id"?: string | null,"target_id": string,"target_professional_id"?: string | null,"target_type": string,"verification"?: Json | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_kind"?: Database["public"]['Enums']["audit_actor_kind"],"actor_system"?: string | null,"changes"?: NonNullable<Json>,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"note"?: Json | null,"request_id"?: string | null,"stripe_event_id"?: string | null,"target_id"?: string,"target_professional_id"?: string | null,"target_type"?: string,"verification"?: Json | null
                  }
                  Relationships: [
                    
                  ]
                },"availability_exceptions": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"kind": Database["public"]['Enums']["availability_exception_kind"],"professional_id": string,"starts_at": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"kind": Database["public"]['Enums']["availability_exception_kind"],"professional_id": string,"starts_at": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["availability_exception_kind"],"professional_id"?: string,"starts_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_exceptions_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_rules": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"professional_id": string,"starts_at": string,"time_zone": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"professional_id": string,"starts_at": string,"time_zone": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"professional_id"?: string,"starts_at"?: string,"time_zone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_rules_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                },"banners": {
                  Row: {
                    "active": boolean,"cancelled_at": string | null,"created_at": string,"current_period_end": string | null,"id": string,"professional_id": string,"stripe_subscription_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"cancelled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"id"?: string,"professional_id": string,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"cancelled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"id"?: string,"professional_id"?: string,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "banners_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: true
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "age_group": Database["public"]['Enums']["age_group"] | null,"booked_at": string,"booked_by": Database["public"]['Enums']["booked_by"],"cancelled_at": string | null,"cancelled_by": Database["public"]['Enums']["cancelled_by"] | null,"card_processing_cents": number,"concern": string | null,"concern_locale": Database["public"]['Enums']["app_locale"] | null,"created_at": string,"currency": string,"doctor_fee_cents": number,"done_at": string | null,"ends_at": string,"hold_id": string | null,"id": string,"join_url": string | null,"patient_country": string | null,"patient_first_name_ar": string | null,"patient_first_name_en": string | null,"patient_id": string | null,"patient_phone": string | null,"patient_time_zone": string,"payment_intent_id": string,"platform_fee_cents": number,"prepared": (string)[],"professional_id": string,"professional_time_zone": string,"starts_at": string,"status": Database["public"]['Enums']["booking_status"],"stripe_transfer_id": string | null,"total_cents": number | null,"updated_at": string,"visit_type": Database["public"]['Enums']["visit_type"]
                  }
                  Insert: {
                    "age_group"?: Database["public"]['Enums']["age_group"] | null,"booked_at"?: string,"booked_by"?: Database["public"]['Enums']["booked_by"],"cancelled_at"?: string | null,"cancelled_by"?: Database["public"]['Enums']["cancelled_by"] | null,"card_processing_cents": number,"concern"?: string | null,"concern_locale"?: Database["public"]['Enums']["app_locale"] | null,"created_at"?: string,"currency": string,"doctor_fee_cents": number,"done_at"?: string | null,"ends_at": string,"hold_id"?: string | null,"id"?: string,"join_url"?: string | null,"patient_country"?: string | null,"patient_first_name_ar"?: string | null,"patient_first_name_en"?: string | null,"patient_id"?: string | null,"patient_phone"?: string | null,"patient_time_zone": string,"payment_intent_id": string,"platform_fee_cents": number,"prepared"?: (string)[],"professional_id": string,"professional_time_zone": string,"starts_at": string,"status"?: Database["public"]['Enums']["booking_status"],"stripe_transfer_id"?: string | null,"total_cents"?: never,"updated_at"?: string,"visit_type": Database["public"]['Enums']["visit_type"]
                  }
                  Update: {
                    "age_group"?: Database["public"]['Enums']["age_group"] | null,"booked_at"?: string,"booked_by"?: Database["public"]['Enums']["booked_by"],"cancelled_at"?: string | null,"cancelled_by"?: Database["public"]['Enums']["cancelled_by"] | null,"card_processing_cents"?: number,"concern"?: string | null,"concern_locale"?: Database["public"]['Enums']["app_locale"] | null,"created_at"?: string,"currency"?: string,"doctor_fee_cents"?: number,"done_at"?: string | null,"ends_at"?: string,"hold_id"?: string | null,"id"?: string,"join_url"?: string | null,"patient_country"?: string | null,"patient_first_name_ar"?: string | null,"patient_first_name_en"?: string | null,"patient_id"?: string | null,"patient_phone"?: string | null,"patient_time_zone"?: string,"payment_intent_id"?: string,"platform_fee_cents"?: number,"prepared"?: (string)[],"professional_id"?: string,"professional_time_zone"?: string,"starts_at"?: string,"status"?: Database["public"]['Enums']["booking_status"],"stripe_transfer_id"?: string | null,"total_cents"?: never,"updated_at"?: string,"visit_type"?: Database["public"]['Enums']["visit_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_hold_id_fkey"
      columns: ["hold_id"]
isOneToOne: true
      referencedRelation: "slot_holds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "copy_version": string,"granted_at": string,"id": string,"kind": Database["public"]['Enums']["consent_kind"],"locale": Database["public"]['Enums']["app_locale"],"record_set_id": string | null,"sharing_id": string | null,"user_id": string,"withdrawn_at": string | null
                  }
                  Insert: {
                    "copy_version": string,"granted_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["consent_kind"],"locale": Database["public"]['Enums']["app_locale"],"record_set_id"?: string | null,"sharing_id"?: string | null,"user_id": string,"withdrawn_at"?: string | null
                  }
                  Update: {
                    "copy_version"?: string,"granted_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["consent_kind"],"locale"?: Database["public"]['Enums']["app_locale"],"record_set_id"?: string | null,"sharing_id"?: string | null,"user_id"?: string,"withdrawn_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_record_set_id_fkey"
      columns: ["record_set_id"]
isOneToOne: false
      referencedRelation: "record_sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_sharing_id_fkey"
      columns: ["sharing_id"]
isOneToOne: false
      referencedRelation: "record_shares"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"credentials": {
                  Row: {
                    "file_name": string,"id": string,"kind": Database["public"]['Enums']["credential_kind"],"mime_type": string,"professional_id": string,"rejection_reason_ar": string | null,"rejection_reason_en": string | null,"review_status": Database["public"]['Enums']["credential_review_status"],"reviewed_at": string | null,"reviewed_by": string | null,"size_bytes": number,"storage_path": string,"uploaded_at": string
                  }
                  Insert: {
                    "file_name": string,"id"?: string,"kind": Database["public"]['Enums']["credential_kind"],"mime_type": string,"professional_id": string,"rejection_reason_ar"?: string | null,"rejection_reason_en"?: string | null,"review_status"?: Database["public"]['Enums']["credential_review_status"],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"size_bytes": number,"storage_path": string,"uploaded_at"?: string
                  }
                  Update: {
                    "file_name"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["credential_kind"],"mime_type"?: string,"professional_id"?: string,"rejection_reason_ar"?: string | null,"rejection_reason_en"?: string | null,"review_status"?: Database["public"]['Enums']["credential_review_status"],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"size_bytes"?: number,"storage_path"?: string,"uploaded_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "credentials_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "credentials_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"expertise_tags": {
                  Row: {
                    "created_at": string,"id": string,"locale": Database["public"]['Enums']["app_locale"],"nugget": string | null,"position": number,"professional_id": string,"title": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"locale": Database["public"]['Enums']["app_locale"],"nugget"?: string | null,"position": number,"professional_id": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"locale"?: Database["public"]['Enums']["app_locale"],"nugget"?: string | null,"position"?: number,"professional_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expertise_tags_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                },"introduction_requests": {
                  Row: {
                    "age_group": Database["public"]['Enums']["age_group"] | null,"answered_at": string | null,"booked_by": Database["public"]['Enums']["booked_by"],"booking_id": string | null,"concern": string | null,"concern_locale": Database["public"]['Enums']["app_locale"] | null,"consent_id": string | null,"created_at": string,"id": string,"patient_first_name_ar": string | null,"patient_first_name_en": string | null,"patient_gender": Database["public"]['Enums']["gender"] | null,"patient_id": string | null,"patient_time_zone": string,"prepared": (string)[],"professional_id": string,"received_at": string,"requested_start": string,"specialty_id": string | null,"status": Database["public"]['Enums']["introduction_request_status"],"transcript": Json | null,"updated_at": string,"visit_type": Database["public"]['Enums']["visit_type"],"withdrawn_at": string | null
                  }
                  Insert: {
                    "age_group"?: Database["public"]['Enums']["age_group"] | null,"answered_at"?: string | null,"booked_by"?: Database["public"]['Enums']["booked_by"],"booking_id"?: string | null,"concern"?: string | null,"concern_locale"?: Database["public"]['Enums']["app_locale"] | null,"consent_id"?: string | null,"created_at"?: string,"id"?: string,"patient_first_name_ar"?: string | null,"patient_first_name_en"?: string | null,"patient_gender"?: Database["public"]['Enums']["gender"] | null,"patient_id"?: string | null,"patient_time_zone": string,"prepared"?: (string)[],"professional_id": string,"received_at"?: string,"requested_start": string,"specialty_id"?: string | null,"status"?: Database["public"]['Enums']["introduction_request_status"],"transcript"?: Json | null,"updated_at"?: string,"visit_type": Database["public"]['Enums']["visit_type"],"withdrawn_at"?: string | null
                  }
                  Update: {
                    "age_group"?: Database["public"]['Enums']["age_group"] | null,"answered_at"?: string | null,"booked_by"?: Database["public"]['Enums']["booked_by"],"booking_id"?: string | null,"concern"?: string | null,"concern_locale"?: Database["public"]['Enums']["app_locale"] | null,"consent_id"?: string | null,"created_at"?: string,"id"?: string,"patient_first_name_ar"?: string | null,"patient_first_name_en"?: string | null,"patient_gender"?: Database["public"]['Enums']["gender"] | null,"patient_id"?: string | null,"patient_time_zone"?: string,"prepared"?: (string)[],"professional_id"?: string,"received_at"?: string,"requested_start"?: string,"specialty_id"?: string | null,"status"?: Database["public"]['Enums']["introduction_request_status"],"transcript"?: Json | null,"updated_at"?: string,"visit_type"?: Database["public"]['Enums']["visit_type"],"withdrawn_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "introduction_requests_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introduction_requests_consent_id_fkey"
      columns: ["consent_id"]
isOneToOne: false
      referencedRelation: "consents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introduction_requests_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introduction_requests_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introduction_requests_specialty_id_fkey"
      columns: ["specialty_id"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "bounce": Database["public"]['Enums']["invite_bounce"] | null,"bounced_at": string | null,"created_at": string,"created_by": string | null,"email": string,"expires_at": string,"id": string,"language": Database["public"]['Enums']["app_locale"],"opened_at": string | null,"personal_line": string | null,"professional_id": string,"revoked_at": string | null,"revoked_by": string | null,"sent_at": string,"token_hash": string,"used_at": string | null,"used_by": string | null,"current_status": Database["public"]['Enums']["invite_status"] | null
                  }
                  Insert: {
                    "bounce"?: Database["public"]['Enums']["invite_bounce"] | null,"bounced_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"email": string,"expires_at": string,"id"?: string,"language"?: Database["public"]['Enums']["app_locale"],"opened_at"?: string | null,"personal_line"?: string | null,"professional_id": string,"revoked_at"?: string | null,"revoked_by"?: string | null,"sent_at"?: string,"token_hash": string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "bounce"?: Database["public"]['Enums']["invite_bounce"] | null,"bounced_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string,"expires_at"?: string,"id"?: string,"language"?: Database["public"]['Enums']["app_locale"],"opened_at"?: string | null,"personal_line"?: string | null,"professional_id"?: string,"revoked_at"?: string | null,"revoked_by"?: string | null,"sent_at"?: string,"token_hash"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_revoked_by_fkey"
      columns: ["revoked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_used_by_fkey"
      columns: ["used_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "cancelled_at": string | null,"comp_until": string | null,"created_at": string,"current_period_end": string | null,"grace_extended_until": string | null,"id": string,"interval": Database["public"]['Enums']["billing_interval"] | null,"last_invoice_at": string | null,"last_invoice_id": string | null,"last_invoice_number": string | null,"last_invoice_status": Database["public"]['Enums']["invoice_status"] | null,"payment_failed_at": string | null,"professional_id": string,"started_at": string | null,"status": Database["public"]['Enums']["membership_status"],"stripe_customer_id": string | null,"stripe_subscription_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "cancelled_at"?: string | null,"comp_until"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"grace_extended_until"?: string | null,"id"?: string,"interval"?: Database["public"]['Enums']["billing_interval"] | null,"last_invoice_at"?: string | null,"last_invoice_id"?: string | null,"last_invoice_number"?: string | null,"last_invoice_status"?: Database["public"]['Enums']["invoice_status"] | null,"payment_failed_at"?: string | null,"professional_id": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["membership_status"],"stripe_customer_id"?: string | null,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "cancelled_at"?: string | null,"comp_until"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"grace_extended_until"?: string | null,"id"?: string,"interval"?: Database["public"]['Enums']["billing_interval"] | null,"last_invoice_at"?: string | null,"last_invoice_id"?: string | null,"last_invoice_number"?: string | null,"last_invoice_status"?: Database["public"]['Enums']["invoice_status"] | null,"payment_failed_at"?: string | null,"professional_id"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["membership_status"],"stripe_customer_id"?: string | null,"stripe_subscription_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: true
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                },"professional_private": {
                  Row: {
                    "created_at": string,"licence_expires_on": string | null,"licence_number": string | null,"professional_id": string,"registry_as_filed": Json | null,"stripe_account_id": string | null,"stripe_bank_last4": string | null,"stripe_charges_enabled": boolean,"stripe_currently_due": (string)[],"stripe_details_submitted": boolean,"stripe_past_due": (string)[],"stripe_payouts_enabled": boolean,"stripe_updated_at": string | null,"suspended_at": string | null,"suspended_by": string | null,"suspension_reason_ar": string | null,"suspension_reason_en": string | null,"updated_at": string,"video_link": string | null
                  }
                  Insert: {
                    "created_at"?: string,"licence_expires_on"?: string | null,"licence_number"?: string | null,"professional_id": string,"registry_as_filed"?: Json | null,"stripe_account_id"?: string | null,"stripe_bank_last4"?: string | null,"stripe_charges_enabled"?: boolean,"stripe_currently_due"?: (string)[],"stripe_details_submitted"?: boolean,"stripe_past_due"?: (string)[],"stripe_payouts_enabled"?: boolean,"stripe_updated_at"?: string | null,"suspended_at"?: string | null,"suspended_by"?: string | null,"suspension_reason_ar"?: string | null,"suspension_reason_en"?: string | null,"updated_at"?: string,"video_link"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"licence_expires_on"?: string | null,"licence_number"?: string | null,"professional_id"?: string,"registry_as_filed"?: Json | null,"stripe_account_id"?: string | null,"stripe_bank_last4"?: string | null,"stripe_charges_enabled"?: boolean,"stripe_currently_due"?: (string)[],"stripe_details_submitted"?: boolean,"stripe_past_due"?: (string)[],"stripe_payouts_enabled"?: boolean,"stripe_updated_at"?: string | null,"suspended_at"?: string | null,"suspended_by"?: string | null,"suspension_reason_ar"?: string | null,"suspension_reason_en"?: string | null,"updated_at"?: string,"video_link"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "professional_private_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: true
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "professional_private_suspended_by_fkey"
      columns: ["suspended_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"professional_specialties": {
                  Row: {
                    "created_at": string,"is_primary": boolean,"professional_id": string,"specialty_id": string,"taxonomy_code": string | null
                  }
                  Insert: {
                    "created_at"?: string,"is_primary"?: boolean,"professional_id": string,"specialty_id": string,"taxonomy_code"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"is_primary"?: boolean,"professional_id"?: string,"specialty_id"?: string,"taxonomy_code"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "professional_specialties_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "professional_specialties_specialty_id_fkey"
      columns: ["specialty_id"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["id"]
    }
                  ]
                },"professionals": {
                  Row: {
                    "accepting_new_patients": boolean,"age_scope": Database["public"]['Enums']["age_scope"] | null,"arabic_dialect": string | null,"bio_ar": string | null,"bio_en": string | null,"board_certified": boolean,"board_name": string | null,"board_status": Database["public"]['Enums']["board_status"] | null,"can_take_bookings": boolean,"city_ar": string | null,"city_en": string | null,"claimed_at": string | null,"cms_as_of": string | null,"created_at": string,"fee_cents": number | null,"fee_currency": string,"first_name": string,"gender": Database["public"]['Enums']["gender"] | null,"graduation_year": number | null,"group_practice": string | null,"hospital_affiliations": (string)[],"id": string,"languages": (string)[],"last_name": string,"lead_time_hours": number | null,"licence_state": string | null,"medical_school": string | null,"middle_name": string | null,"name_ar": string | null,"name_en": string,"npi": string,"photo_url": string | null,"practice_country": string | null,"registry_as_of": string | null,"registry_credential": string | null,"registry_profession": string | null,"registry_source": string | null,"removed_at": string | null,"review_decided_at": string | null,"review_submitted_at": string | null,"reviewed_by": string | null,"slot_minutes": number | null,"slug": string,"source": Database["public"]['Enums']["professional_source"],"specialty_id": string | null,"state_code": string | null,"status": Database["public"]['Enums']["professional_status"],"taxonomy_code": string | null,"time_zone": string | null,"training": (string)[],"updated_at": string,"user_id": string | null,"verified_on": string | null,"visit_types": (Database["public"]['Enums']["visit_type"])[],"years_in_practice": number | null
                  }
                  Insert: {
                    "accepting_new_patients"?: boolean,"age_scope"?: Database["public"]['Enums']["age_scope"] | null,"arabic_dialect"?: string | null,"bio_ar"?: string | null,"bio_en"?: string | null,"board_certified"?: boolean,"board_name"?: string | null,"board_status"?: Database["public"]['Enums']["board_status"] | null,"can_take_bookings"?: boolean,"city_ar"?: string | null,"city_en"?: string | null,"claimed_at"?: string | null,"cms_as_of"?: string | null,"created_at"?: string,"fee_cents"?: number | null,"fee_currency"?: string,"first_name": string,"gender"?: Database["public"]['Enums']["gender"] | null,"graduation_year"?: number | null,"group_practice"?: string | null,"hospital_affiliations"?: (string)[],"id"?: string,"languages"?: (string)[],"last_name": string,"lead_time_hours"?: number | null,"licence_state"?: string | null,"medical_school"?: string | null,"middle_name"?: string | null,"name_ar"?: string | null,"name_en": string,"npi": string,"photo_url"?: string | null,"practice_country"?: string | null,"registry_as_of"?: string | null,"registry_credential"?: string | null,"registry_profession"?: string | null,"registry_source"?: string | null,"removed_at"?: string | null,"review_decided_at"?: string | null,"review_submitted_at"?: string | null,"reviewed_by"?: string | null,"slot_minutes"?: number | null,"slug": string,"source"?: Database["public"]['Enums']["professional_source"],"specialty_id"?: string | null,"state_code"?: string | null,"status"?: Database["public"]['Enums']["professional_status"],"taxonomy_code"?: string | null,"time_zone"?: string | null,"training"?: (string)[],"updated_at"?: string,"user_id"?: string | null,"verified_on"?: string | null,"visit_types"?: (Database["public"]['Enums']["visit_type"])[],"years_in_practice"?: number | null
                  }
                  Update: {
                    "accepting_new_patients"?: boolean,"age_scope"?: Database["public"]['Enums']["age_scope"] | null,"arabic_dialect"?: string | null,"bio_ar"?: string | null,"bio_en"?: string | null,"board_certified"?: boolean,"board_name"?: string | null,"board_status"?: Database["public"]['Enums']["board_status"] | null,"can_take_bookings"?: boolean,"city_ar"?: string | null,"city_en"?: string | null,"claimed_at"?: string | null,"cms_as_of"?: string | null,"created_at"?: string,"fee_cents"?: number | null,"fee_currency"?: string,"first_name"?: string,"gender"?: Database["public"]['Enums']["gender"] | null,"graduation_year"?: number | null,"group_practice"?: string | null,"hospital_affiliations"?: (string)[],"id"?: string,"languages"?: (string)[],"last_name"?: string,"lead_time_hours"?: number | null,"licence_state"?: string | null,"medical_school"?: string | null,"middle_name"?: string | null,"name_ar"?: string | null,"name_en"?: string,"npi"?: string,"photo_url"?: string | null,"practice_country"?: string | null,"registry_as_of"?: string | null,"registry_credential"?: string | null,"registry_profession"?: string | null,"registry_source"?: string | null,"removed_at"?: string | null,"review_decided_at"?: string | null,"review_submitted_at"?: string | null,"reviewed_by"?: string | null,"slot_minutes"?: number | null,"slug"?: string,"source"?: Database["public"]['Enums']["professional_source"],"specialty_id"?: string | null,"state_code"?: string | null,"status"?: Database["public"]['Enums']["professional_status"],"taxonomy_code"?: string | null,"time_zone"?: string | null,"training"?: (string)[],"updated_at"?: string,"user_id"?: string | null,"verified_on"?: string | null,"visit_types"?: (Database["public"]['Enums']["visit_type"])[],"years_in_practice"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "professionals_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "professionals_specialty_id_fkey"
      columns: ["specialty_id"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "professionals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "country": string | null,"created_at": string,"deletion_requested_at": string | null,"email": string | null,"email_news": boolean,"email_share_opened": boolean,"email_summary_ready": boolean,"first_name_ar": string | null,"first_name_en": string | null,"gender": Database["public"]['Enums']["gender"] | null,"hijri": boolean,"id": string,"locale": Database["public"]['Enums']["app_locale"],"name_ar": string | null,"name_en": string | null,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"time_zone": string | null,"updated_at": string
                  }
                  Insert: {
                    "country"?: string | null,"created_at"?: string,"deletion_requested_at"?: string | null,"email"?: string | null,"email_news"?: boolean,"email_share_opened"?: boolean,"email_summary_ready"?: boolean,"first_name_ar"?: string | null,"first_name_en"?: string | null,"gender"?: Database["public"]['Enums']["gender"] | null,"hijri"?: boolean,"id": string,"locale"?: Database["public"]['Enums']["app_locale"],"name_ar"?: string | null,"name_en"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"time_zone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "country"?: string | null,"created_at"?: string,"deletion_requested_at"?: string | null,"email"?: string | null,"email_news"?: boolean,"email_share_opened"?: boolean,"email_summary_ready"?: boolean,"first_name_ar"?: string | null,"first_name_en"?: string | null,"gender"?: Database["public"]['Enums']["gender"] | null,"hijri"?: boolean,"id"?: string,"locale"?: Database["public"]['Enums']["app_locale"],"name_ar"?: string | null,"name_en"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"time_zone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"receipts": {
                  Row: {
                    "amount_cents": number,"booking_id": string | null,"card_brand": string | null,"card_last4": string | null,"created_at": string,"currency": string,"id": string,"paid_at": string,"patient_id": string | null,"receipt_number": string,"record_set_id": string | null,"stripe_charge_id": string | null,"stripe_payment_intent_id": string,"subject": string,"wallet": Database["public"]['Enums']["payment_wallet"] | null
                  }
                  Insert: {
                    "amount_cents": number,"booking_id"?: string | null,"card_brand"?: string | null,"card_last4"?: string | null,"created_at"?: string,"currency": string,"id"?: string,"paid_at": string,"patient_id"?: string | null,"receipt_number": string,"record_set_id"?: string | null,"stripe_charge_id"?: string | null,"stripe_payment_intent_id": string,"subject"?: string,"wallet"?: Database["public"]['Enums']["payment_wallet"] | null
                  }
                  Update: {
                    "amount_cents"?: number,"booking_id"?: string | null,"card_brand"?: string | null,"card_last4"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"paid_at"?: string,"patient_id"?: string | null,"receipt_number"?: string,"record_set_id"?: string | null,"stripe_charge_id"?: string | null,"stripe_payment_intent_id"?: string,"subject"?: string,"wallet"?: Database["public"]['Enums']["payment_wallet"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "receipts_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receipts_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receipts_record_set_id_fkey"
      columns: ["record_set_id"]
isOneToOne: true
      referencedRelation: "record_sets"
      referencedColumns: ["id"]
    }
                  ]
                },"record_files": {
                  Row: {
                    "id": string,"kind": Database["public"]['Enums']["record_file_kind"],"mime_type": string | null,"name": string,"page_count": number | null,"patient_id": string,"position": number,"reject_reason": Database["public"]['Enums']["record_reject_reason"] | null,"set_id": string,"sha256": string | null,"size_bytes": number,"status": Database["public"]['Enums']["record_file_status"],"storage_path": string,"uploaded_at": string
                  }
                  Insert: {
                    "id"?: string,"kind": Database["public"]['Enums']["record_file_kind"],"mime_type"?: string | null,"name": string,"page_count"?: number | null,"patient_id": string,"position": number,"reject_reason"?: Database["public"]['Enums']["record_reject_reason"] | null,"set_id": string,"sha256"?: string | null,"size_bytes": number,"status"?: Database["public"]['Enums']["record_file_status"],"storage_path": string,"uploaded_at"?: string
                  }
                  Update: {
                    "id"?: string,"kind"?: Database["public"]['Enums']["record_file_kind"],"mime_type"?: string | null,"name"?: string,"page_count"?: number | null,"patient_id"?: string,"position"?: number,"reject_reason"?: Database["public"]['Enums']["record_reject_reason"] | null,"set_id"?: string,"sha256"?: string | null,"size_bytes"?: number,"status"?: Database["public"]['Enums']["record_file_status"],"storage_path"?: string,"uploaded_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "record_files_set_fkey"
      columns: ["set_id","patient_id"]
isOneToOne: false
      referencedRelation: "record_sets"
      referencedColumns: ["id","patient_id"]
    }
                  ]
                },"record_items": {
                  Row: {
                    "canonical_item_id": string | null,"confidence": number | null,"created_at": string,"details": NonNullable<Json>,"id": string,"item_date": string | null,"label": string,"patient_id": string,"ref_high": number | null,"ref_low": number | null,"set_id": string,"source_page_id": string,"type": Database["public"]['Enums']["record_item_type"],"unit": string | null,"value_decimals": number | null,"value_numeric": number | null,"value_text": string | null
                  }
                  Insert: {
                    "canonical_item_id"?: string | null,"confidence"?: number | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"item_date"?: string | null,"label": string,"patient_id": string,"ref_high"?: number | null,"ref_low"?: number | null,"set_id": string,"source_page_id": string,"type": Database["public"]['Enums']["record_item_type"],"unit"?: string | null,"value_decimals"?: number | null,"value_numeric"?: number | null,"value_text"?: string | null
                  }
                  Update: {
                    "canonical_item_id"?: string | null,"confidence"?: number | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"item_date"?: string | null,"label"?: string,"patient_id"?: string,"ref_high"?: number | null,"ref_low"?: number | null,"set_id"?: string,"source_page_id"?: string,"type"?: Database["public"]['Enums']["record_item_type"],"unit"?: string | null,"value_decimals"?: number | null,"value_numeric"?: number | null,"value_text"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "record_items_canonical_item_id_fkey"
      columns: ["canonical_item_id"]
isOneToOne: false
      referencedRelation: "record_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_items_source_page_fkey"
      columns: ["source_page_id","set_id","patient_id"]
isOneToOne: false
      referencedRelation: "record_pages"
      referencedColumns: ["id","set_id","patient_id"]
    }
                  ]
                },"record_pages": {
                  Row: {
                    "attempts": number,"extracted_at": string | null,"file_id": string,"id": string,"page_number": number,"patient_id": string,"set_id": string,"set_page_number": number,"status": Database["public"]['Enums']["page_status"],"unreadable_reason": Database["public"]['Enums']["unreadable_reason"] | null
                  }
                  Insert: {
                    "attempts"?: number,"extracted_at"?: string | null,"file_id": string,"id"?: string,"page_number": number,"patient_id": string,"set_id": string,"set_page_number": number,"status"?: Database["public"]['Enums']["page_status"],"unreadable_reason"?: Database["public"]['Enums']["unreadable_reason"] | null
                  }
                  Update: {
                    "attempts"?: number,"extracted_at"?: string | null,"file_id"?: string,"id"?: string,"page_number"?: number,"patient_id"?: string,"set_id"?: string,"set_page_number"?: number,"status"?: Database["public"]['Enums']["page_status"],"unreadable_reason"?: Database["public"]['Enums']["unreadable_reason"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "record_pages_file_fkey"
      columns: ["file_id","set_id","patient_id"]
isOneToOne: false
      referencedRelation: "record_files"
      referencedColumns: ["id","set_id","patient_id"]
    }
                  ]
                },"record_sets": {
                  Row: {
                    "accepted_bytes": number,"cancelled_at": string | null,"created_at": string,"failure_file_id": string | null,"failure_file_page": number | null,"failure_reason": Database["public"]['Enums']["pipeline_failure_reason"] | null,"finished_at": string | null,"id": string,"page_count": number,"paid_at": string | null,"patient_id": string,"payment_intent_id": string | null,"quote_cents": number | null,"quote_currency": string | null,"status": Database["public"]['Enums']["record_set_status"],"step": Database["public"]['Enums']["pipeline_step"] | null,"updated_at": string
                  }
                  Insert: {
                    "accepted_bytes"?: number,"cancelled_at"?: string | null,"created_at"?: string,"failure_file_id"?: string | null,"failure_file_page"?: number | null,"failure_reason"?: Database["public"]['Enums']["pipeline_failure_reason"] | null,"finished_at"?: string | null,"id"?: string,"page_count"?: number,"paid_at"?: string | null,"patient_id": string,"payment_intent_id"?: string | null,"quote_cents"?: number | null,"quote_currency"?: string | null,"status"?: Database["public"]['Enums']["record_set_status"],"step"?: Database["public"]['Enums']["pipeline_step"] | null,"updated_at"?: string
                  }
                  Update: {
                    "accepted_bytes"?: number,"cancelled_at"?: string | null,"created_at"?: string,"failure_file_id"?: string | null,"failure_file_page"?: number | null,"failure_reason"?: Database["public"]['Enums']["pipeline_failure_reason"] | null,"finished_at"?: string | null,"id"?: string,"page_count"?: number,"paid_at"?: string | null,"patient_id"?: string,"payment_intent_id"?: string | null,"quote_cents"?: number | null,"quote_currency"?: string | null,"status"?: Database["public"]['Enums']["record_set_status"],"step"?: Database["public"]['Enums']["pipeline_step"] | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "record_sets_failure_file_fkey"
      columns: ["failure_file_id"]
isOneToOne: false
      referencedRelation: "record_files"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_sets_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"record_shares": {
                  Row: {
                    "booking_id": string | null,"created_at": string,"expires_at": string,"id": string,"patient_first_name_ar": string | null,"patient_first_name_en": string | null,"patient_gender": Database["public"]['Enums']["gender"] | null,"patient_id": string,"professional_id": string,"revoked_at": string | null,"shared_at": string,"summary_id": string,"updated_at": string,"viewed_at": string | null
                  }
                  Insert: {
                    "booking_id"?: string | null,"created_at"?: string,"expires_at": string,"id"?: string,"patient_first_name_ar"?: string | null,"patient_first_name_en"?: string | null,"patient_gender"?: Database["public"]['Enums']["gender"] | null,"patient_id": string,"professional_id": string,"revoked_at"?: string | null,"shared_at"?: string,"summary_id": string,"updated_at"?: string,"viewed_at"?: string | null
                  }
                  Update: {
                    "booking_id"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"patient_first_name_ar"?: string | null,"patient_first_name_en"?: string | null,"patient_gender"?: Database["public"]['Enums']["gender"] | null,"patient_id"?: string,"professional_id"?: string,"revoked_at"?: string | null,"shared_at"?: string,"summary_id"?: string,"updated_at"?: string,"viewed_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "record_shares_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_shares_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_shares_summary_fkey"
      columns: ["summary_id","patient_id"]
isOneToOne: false
      referencedRelation: "record_summaries"
      referencedColumns: ["id","patient_id"]
    }
                  ]
                },"record_summaries": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"generated_at": string,"id": string,"patient_id": string,"reviewed_at": string | null,"reviewed_by_professional_id": string | null,"set_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"data": NonNullable<Json>,"generated_at"?: string,"id"?: string,"patient_id": string,"reviewed_at"?: string | null,"reviewed_by_professional_id"?: string | null,"set_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"generated_at"?: string,"id"?: string,"patient_id"?: string,"reviewed_at"?: string | null,"reviewed_by_professional_id"?: string | null,"set_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "record_summaries_reviewed_by_professional_id_fkey"
      columns: ["reviewed_by_professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "record_summaries_set_fkey"
      columns: ["set_id","patient_id"]
isOneToOne: false
      referencedRelation: "record_sets"
      referencedColumns: ["id","patient_id"]
    }
                  ]
                },"refunds": {
                  Row: {
                    "amount_cents": number,"booking_id": string | null,"created_at": string,"currency": string,"id": string,"idempotency_key": string,"initiated_by": Database["public"]['Enums']["refund_initiator"],"note_ar": string | null,"note_en": string | null,"patient_id": string | null,"reason": Database["public"]['Enums']["refund_reason"],"receipt_id": string | null,"record_set_id": string | null,"requested_at": string,"requested_by": string | null,"status": Database["public"]['Enums']["refund_status"],"stripe_refund_id": string | null,"subject": string,"succeeded_at": string | null,"updated_at": string
                  }
                  Insert: {
                    "amount_cents": number,"booking_id"?: string | null,"created_at"?: string,"currency": string,"id"?: string,"idempotency_key": string,"initiated_by": Database["public"]['Enums']["refund_initiator"],"note_ar"?: string | null,"note_en"?: string | null,"patient_id"?: string | null,"reason": Database["public"]['Enums']["refund_reason"],"receipt_id"?: string | null,"record_set_id"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["refund_status"],"stripe_refund_id"?: string | null,"subject"?: string,"succeeded_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"booking_id"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"idempotency_key"?: string,"initiated_by"?: Database["public"]['Enums']["refund_initiator"],"note_ar"?: string | null,"note_en"?: string | null,"patient_id"?: string | null,"reason"?: Database["public"]['Enums']["refund_reason"],"receipt_id"?: string | null,"record_set_id"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["refund_status"],"stripe_refund_id"?: string | null,"subject"?: string,"succeeded_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "refunds_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_receipt_id_fkey"
      columns: ["receipt_id"]
isOneToOne: false
      referencedRelation: "receipts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_record_set_id_fkey"
      columns: ["record_set_id"]
isOneToOne: false
      referencedRelation: "record_sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"removal_requests": {
                  Row: {
                    "confirm_token_hash": string | null,"created_at": string,"decided_at": string | null,"decided_by": string | null,"decision_reason": string | null,"details": string,"email_confirmed_at": string | null,"id": string,"info_question": string | null,"info_requested_at": string | null,"info_requested_by": string | null,"locale": Database["public"]['Enums']["app_locale"],"npi": string,"professional_id": string,"reason": Database["public"]['Enums']["removal_reason"],"received_at": string,"requester_email": string,"requester_name": string,"status": Database["public"]['Enums']["removal_status"],"updated_at": string
                  }
                  Insert: {
                    "confirm_token_hash"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_reason"?: string | null,"details"?: string,"email_confirmed_at"?: string | null,"id"?: string,"info_question"?: string | null,"info_requested_at"?: string | null,"info_requested_by"?: string | null,"locale": Database["public"]['Enums']["app_locale"],"npi": string,"professional_id": string,"reason": Database["public"]['Enums']["removal_reason"],"received_at"?: string,"requester_email": string,"requester_name": string,"status"?: Database["public"]['Enums']["removal_status"],"updated_at"?: string
                  }
                  Update: {
                    "confirm_token_hash"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_reason"?: string | null,"details"?: string,"email_confirmed_at"?: string | null,"id"?: string,"info_question"?: string | null,"info_requested_at"?: string | null,"info_requested_by"?: string | null,"locale"?: Database["public"]['Enums']["app_locale"],"npi"?: string,"professional_id"?: string,"reason"?: Database["public"]['Enums']["removal_reason"],"received_at"?: string,"requester_email"?: string,"requester_name"?: string,"status"?: Database["public"]['Enums']["removal_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "removal_requests_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "removal_requests_info_requested_by_fkey"
      columns: ["info_requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "removal_requests_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                },"slot_holds": {
                  Row: {
                    "age_group": Database["public"]['Enums']["age_group"] | null,"booked_by": Database["public"]['Enums']["booked_by"],"concern": string | null,"concern_locale": Database["public"]['Enums']["app_locale"] | null,"consumed_at": string | null,"created_at": string,"expires_at": string,"id": string,"patient_country": string | null,"patient_id": string,"patient_phone": string | null,"payment_intent_id": string | null,"professional_id": string,"slot_end": string,"slot_start": string,"status": Database["public"]['Enums']["slot_hold_status"],"visit_type": Database["public"]['Enums']["visit_type"]
                  }
                  Insert: {
                    "age_group"?: Database["public"]['Enums']["age_group"] | null,"booked_by"?: Database["public"]['Enums']["booked_by"],"concern"?: string | null,"concern_locale"?: Database["public"]['Enums']["app_locale"] | null,"consumed_at"?: string | null,"created_at"?: string,"expires_at": string,"id"?: string,"patient_country"?: string | null,"patient_id": string,"patient_phone"?: string | null,"payment_intent_id"?: string | null,"professional_id": string,"slot_end": string,"slot_start": string,"status"?: Database["public"]['Enums']["slot_hold_status"],"visit_type": Database["public"]['Enums']["visit_type"]
                  }
                  Update: {
                    "age_group"?: Database["public"]['Enums']["age_group"] | null,"booked_by"?: Database["public"]['Enums']["booked_by"],"concern"?: string | null,"concern_locale"?: Database["public"]['Enums']["app_locale"] | null,"consumed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"patient_country"?: string | null,"patient_id"?: string,"patient_phone"?: string | null,"payment_intent_id"?: string | null,"professional_id"?: string,"slot_end"?: string,"slot_start"?: string,"status"?: Database["public"]['Enums']["slot_hold_status"],"visit_type"?: Database["public"]['Enums']["visit_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "slot_holds_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "slot_holds_professional_id_fkey"
      columns: ["professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["id"]
    }
                  ]
                },"specialties": {
                  Row: {
                    "body_system": string | null,"created_at": string,"id": string,"name_ar": string,"name_en": string,"position": number,"shown": boolean,"slug": string,"synonyms_ar": (string)[],"synonyms_en": (string)[],"taxonomy_codes": (string)[],"updated_at": string
                  }
                  Insert: {
                    "body_system"?: string | null,"created_at"?: string,"id"?: string,"name_ar": string,"name_en": string,"position"?: number,"shown"?: boolean,"slug": string,"synonyms_ar"?: (string)[],"synonyms_en"?: (string)[],"taxonomy_codes"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "body_system"?: string | null,"created_at"?: string,"id"?: string,"name_ar"?: string,"name_en"?: string,"position"?: number,"shown"?: boolean,"slug"?: string,"synonyms_ar"?: (string)[],"synonyms_en"?: (string)[],"taxonomy_codes"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stripe_events": {
                  Row: {
                    "attempted_at": string,"created_at": string,"error": string | null,"event_id": string,"handled_at": string | null,"payload": NonNullable<Json>,"received_at": string,"type": string
                  }
                  Insert: {
                    "attempted_at"?: string,"created_at": string,"error"?: string | null,"event_id": string,"handled_at"?: string | null,"payload": NonNullable<Json>,"received_at"?: string,"type": string
                  }
                  Update: {
                    "attempted_at"?: string,"created_at"?: string,"error"?: string | null,"event_id"?: string,"handled_at"?: string | null,"payload"?: NonNullable<Json>,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_status":
{ Args: { "invite": Database["public"]['Tables']["invites"]['Row'] }; Returns: Database["public"]['Enums']["invite_status"]
                           },
"mark_storage_purged":
{ Args: { "purge_id": number }; Returns: boolean
                           },
"pending_storage_purges":
{ Args: { "max_rows"?: number }; Returns: {
              "bucket_id": string,"id": number,"prefix": string,"queued_at": string
            }[]
                           },
"professional_busy_times":
{ Args: { "from_at": string,"professional": string,"to_at": string }; Returns: {
              "ends_at": string,"starts_at": string
            }[]
                           },
"schema_security_report":
{ Args: Record<PropertyKey, never>; Returns: Json
                           }
          }
          Enums: {
            "age_group": "baby"|"child"|"teen"|"adult","age_scope": "adults"|"children"|"allAges","ai_job_kind": "records","ai_job_status": "queued"|"processing"|"failed"|"done"|"cancelled"|"retryQueued","app_locale": "ar"|"en","audit_actor_kind": "admin"|"professional"|"patient"|"system","availability_exception_kind": "off"|"extra","billing_interval": "month"|"year","board_status": "certified"|"eligible","booked_by": "self"|"parent","booking_status": "upcoming"|"done"|"cancelled"|"refunded","cancelled_by": "patient"|"doctor"|"platform","consent_kind": "recordsProcessing"|"recordsShare"|"intakeChat","credential_kind": "licence"|"board"|"other","credential_review_status": "pending"|"accepted"|"rejected","gender": "f"|"m","introduction_request_status": "open"|"booked"|"declined"|"withdrawn","invite_bounce": "noMailbox"|"rejected","invite_status": "sent"|"opened"|"claimed"|"expired"|"bounced"|"revoked","invoice_status": "paid"|"failed","membership_status": "none"|"active"|"past_due"|"cancelled","page_status": "read"|"unreadable"|"reading"|"waiting"|"failed"|"notRead","payment_wallet": "applePay"|"googlePay","pipeline_failure_reason": "damaged"|"unavailable","pipeline_step": "validate"|"quote"|"pay"|"extract"|"dedupe"|"summarise"|"flag"|"store"|"notify","professional_source": "nppes"|"self"|"admin","professional_status": "unclaimed"|"claimed"|"pending_review"|"verified"|"rejected"|"suspended"|"removed","record_file_kind": "pdf"|"docx"|"jpg"|"png"|"other","record_file_status": "checking"|"accepted"|"rejected","record_item_type": "condition"|"medication"|"allergy"|"procedure"|"result"|"immunization"|"vital"|"unreadable"|"other","record_reject_reason": "type"|"archive"|"tooLarge"|"setFull"|"empty"|"encrypted"|"duplicate","record_set_status": "draft"|"queued"|"processing"|"failed"|"done"|"cancelled","refund_initiator": "automatic"|"admin","refund_reason": "patientEarly"|"patientLate"|"doctor"|"platform"|"byRule"|"override","refund_status": "pending"|"succeeded"|"failed","removal_reason": "notListed"|"notPractising"|"wrongDetails"|"other","removal_status": "open"|"infoRequested"|"confirmed"|"refused","slot_hold_status": "held"|"consumed","unreadable_reason": "blurry"|"handwritten"|"cutOff","user_role": "patient"|"professional"|"admin","visit_type": "video"|"phone"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "age_group": ["baby", "child", "teen", "adult"],"age_scope": ["adults", "children", "allAges"],"ai_job_kind": ["records"],"ai_job_status": ["queued", "processing", "failed", "done", "cancelled", "retryQueued"],"app_locale": ["ar", "en"],"audit_actor_kind": ["admin", "professional", "patient", "system"],"availability_exception_kind": ["off", "extra"],"billing_interval": ["month", "year"],"board_status": ["certified", "eligible"],"booked_by": ["self", "parent"],"booking_status": ["upcoming", "done", "cancelled", "refunded"],"cancelled_by": ["patient", "doctor", "platform"],"consent_kind": ["recordsProcessing", "recordsShare", "intakeChat"],"credential_kind": ["licence", "board", "other"],"credential_review_status": ["pending", "accepted", "rejected"],"gender": ["f", "m"],"introduction_request_status": ["open", "booked", "declined", "withdrawn"],"invite_bounce": ["noMailbox", "rejected"],"invite_status": ["sent", "opened", "claimed", "expired", "bounced", "revoked"],"invoice_status": ["paid", "failed"],"membership_status": ["none", "active", "past_due", "cancelled"],"page_status": ["read", "unreadable", "reading", "waiting", "failed", "notRead"],"payment_wallet": ["applePay", "googlePay"],"pipeline_failure_reason": ["damaged", "unavailable"],"pipeline_step": ["validate", "quote", "pay", "extract", "dedupe", "summarise", "flag", "store", "notify"],"professional_source": ["nppes", "self", "admin"],"professional_status": ["unclaimed", "claimed", "pending_review", "verified", "rejected", "suspended", "removed"],"record_file_kind": ["pdf", "docx", "jpg", "png", "other"],"record_file_status": ["checking", "accepted", "rejected"],"record_item_type": ["condition", "medication", "allergy", "procedure", "result", "immunization", "vital", "unreadable", "other"],"record_reject_reason": ["type", "archive", "tooLarge", "setFull", "empty", "encrypted", "duplicate"],"record_set_status": ["draft", "queued", "processing", "failed", "done", "cancelled"],"refund_initiator": ["automatic", "admin"],"refund_reason": ["patientEarly", "patientLate", "doctor", "platform", "byRule", "override"],"refund_status": ["pending", "succeeded", "failed"],"removal_reason": ["notListed", "notPractising", "wrongDetails", "other"],"removal_status": ["open", "infoRequested", "confirmed", "refused"],"slot_hold_status": ["held", "consumed"],"unreadable_reason": ["blurry", "handwritten", "cutOff"],"user_role": ["patient", "professional", "admin"],"visit_type": ["video", "phone"]
          }
        }
} as const
