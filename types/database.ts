// Manuaalisesti ylläpidetty tietokantayypitys.
// Päivitä aina kun lisäät migraatioita.
// Vaihtoehtoisesti: npx supabase gen types typescript --project-id <id> > types/database.ts

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          city: string | null
          cancellation_hours: number
          theme: string
          general_notes: string | null
          locale: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          city?: string | null
          cancellation_hours?: number
          theme?: string
          general_notes?: string | null
          locale?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>
        Relationships: []
      }
      services: {
        Row: {
          id: string
          business_id: string
          name: string
          description: string | null
          category: string | null
          duration_minutes: number
          price: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          description?: string | null
          category?: string | null
          duration_minutes: number
          price: number
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['services']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'services_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          business_id: string
          service_id: string
          customer_name: string
          customer_email: string
          customer_phone: string | null
          customer_notes: string | null
          starts_at: string
          ends_at: string
          status: string
          reminder_sent: boolean
          locale: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          service_id: string
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          customer_notes?: string | null
          starts_at: string
          ends_at: string
          status?: string
          reminder_sent?: boolean
          locale?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'bookings_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          }
        ]
      }
      available_slots: {
        Row: {
          id: string
          business_id: string
          date: string
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          date: string
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['available_slots']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'available_slots_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
      blocked_slots: {
        Row: {
          id: string
          business_id: string
          date: string
          slot_time: string
          created_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          date: string
          slot_time: string
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['blocked_slots']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'blocked_slots_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
      waitlist: {
        Row: {
          id: string
          business_id: string
          service_id: string
          customer_name: string
          customer_email: string
          locale: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          service_id: string
          customer_name: string
          customer_email: string
          locale?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['waitlist']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'waitlist_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'waitlist_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
