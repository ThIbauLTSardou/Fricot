// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          invite_code?: string;
        };
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      dishes: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          image_uri: string | null;
          servings: number;
          ingredients: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          image_uri?: string | null;
          servings?: number;
          ingredients?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          image_uri?: string | null;
          servings?: number;
          ingredients?: Json;
          updated_at?: string;
        };
      };
      week_plans: {
        Row: {
          id: string;
          group_id: string;
          plan: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          plan?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          plan?: Json;
          updated_at?: string;
        };
      };
      shopping_items: {
        Row: {
          id: string;
          group_id: string;
          label: string;
          checked: boolean;
          manual: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          label: string;
          checked?: boolean;
          manual?: boolean;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          label?: string;
          checked?: boolean;
          manual?: boolean;
          position?: number;
        };
      };
    };
    Functions: {
      get_my_group_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
  };
}
