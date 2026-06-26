import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useEmails() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('emails')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setEmails(data)
        setLoading(false)
      })

    const channel = supabase
      .channel('emails')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emails' }, (payload) => {
        setEmails(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const draftReply = async (emailId) => {
    const { data, error } = await supabase.functions.invoke('draft-reply', {
      body: { emailId },
    })
    if (error) throw error
    return data.draft
  }

  return { emails, loading, draftReply }
}
