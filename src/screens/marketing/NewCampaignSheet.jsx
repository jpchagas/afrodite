import React, { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, ButtonBase, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { brand } from '../../theme/theme.js'
import * as afroditeApi from '../../services/afroditeApi.js'
import { friendlyMessage } from '../../utils/errors.js'
import BottomSheet from '../../components/BottomSheet.jsx'

function chipSx(selected) {
  return {
    bgcolor: selected ? brand.wine : brand.surface,
    color: selected ? '#fff' : brand.ink,
    border: `1px solid ${selected ? brand.wine : brand.line}`,
    '&:hover': { bgcolor: selected ? brand.wine : brand.blush }
  }
}

/**
 * Nova campanha em 2 passos: público (com contagem ao vivo) → mensagem.
 * `initialSegment` permite abrir já com um público escolhido.
 */
export default function NewCampaignSheet({ open, onClose, initialSegment, onCreated }) {
  const [step, setStep] = useState(0)
  const [segment, setSegment] = useState({ type: 'inativas', params: { days: 90 } })
  const [audience, setAudience] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const messageRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setSegment(initialSegment || { type: 'inativas', params: { days: 90 } })
    setName('')
    setMessage('')
    setError(null)
    afroditeApi.getCatalog({ activeOnly: true }).then((c) => setCatalog(c.filter((i) => i.category !== 'Produto')), () => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Contagem do público ao vivo
  useEffect(() => {
    if (!open) return undefined
    let active = true
    setAudience(null)
    afroditeApi.getSegmentAudience(segment).then(
      (list) => active && setAudience(list),
      () => active && setAudience([])
    )
    return () => {
      active = false
    }
  }, [open, segment])

  const def = afroditeApi.SEGMENTS.find((s) => s.type === segment.type)

  function chooseType(type) {
    const d = afroditeApi.SEGMENTS.find((s) => s.type === type)
    setSegment({ type, params: d.param ? { [d.param.key]: d.param.default ?? '' } : {} })
  }

  function insertVariable(key) {
    const el = messageRef.current
    const token = `{${key}}`
    if (!el) return setMessage((m) => m + token)
    const start = el.selectionStart ?? message.length
    const end = el.selectionEnd ?? message.length
    setMessage(message.slice(0, start) + token + message.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      const campaign = await afroditeApi.createCampaign({ name, segment, message })
      onClose()
      onCreated?.(campaign)
    } catch (err) {
      setError(friendlyMessage(err, 'Não foi possível criar a campanha.'))
    } finally {
      setSaving(false)
    }
  }

  const sample = audience?.[0]

  return (
    <BottomSheet
      open={open}
      onClose={saving ? undefined : onClose}
      title={step === 0 ? 'Para quem?' : 'Mensagem'}
      subtitle={step === 0 ? 'Passo 1 de 2 • escolha o público' : `Passo 2 de 2 • ${afroditeApi.segmentLabel(segment)}`}
      footer={
        step === 0 ? (
          <Button fullWidth size="large" variant="contained" disabled={!audience?.length} onClick={() => setStep(1)}>
            {audience == null ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : audience.length ? `Continuar com ${audience.length} ${audience.length === 1 ? 'pessoa' : 'pessoas'}` : 'Ninguém neste público'}
          </Button>
        ) : (
          <Stack direction="row" spacing={1.25}>
            <Button size="large" variant="outlined" onClick={() => setStep(0)} disabled={saving}>
              Voltar
            </Button>
            <Button fullWidth size="large" variant="contained" disabled={!message.trim() || saving} onClick={handleCreate}>
              {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Criar campanha'}
            </Button>
          </Stack>
        )
      }
    >
      {step === 0 && (
        <Stack spacing={1} sx={{ pt: 1 }}>
          {afroditeApi.SEGMENTS.map((s) => {
            const selected = s.type === segment.type
            return (
              <Box key={s.type} sx={{ borderRadius: '16px', border: `1.5px solid ${selected ? brand.wine : brand.line}`, bgcolor: selected ? brand.blush : brand.surface, transition: 'all 160ms' }}>
                <ButtonBase onClick={() => chooseType(s.type)} sx={{ width: '100%', justifyContent: 'space-between', px: 1.75, py: 1.4, borderRadius: '16px' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {s.label}
                  </Typography>
                  {selected && <CheckCircleRoundedIcon sx={{ color: brand.wine, fontSize: 20 }} />}
                </ButtonBase>
                {selected && s.param && (
                  <Box sx={{ px: 1.75, pb: 1.5 }}>
                    {s.param.catalog ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        label={s.param.label}
                        value={segment.params[s.param.key] || ''}
                        onChange={(e) => setSegment({ type: s.type, params: { [s.param.key]: e.target.value } })}
                      >
                        {catalog.map((c) => (
                          <MenuItem key={c.id} value={c.name}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {s.param.options.map((o) => (
                          <Chip
                            key={o}
                            size="small"
                            label={s.param.suffix ? `${o} ${s.param.suffix}` : o}
                            onClick={() => setSegment({ type: s.type, params: { [s.param.key]: o } })}
                            sx={chipSx(segment.params[s.param.key] === o)}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )
          })}
          <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
            {audience == null
              ? 'Calculando público…'
              : audience.length
                ? `${audience.slice(0, 4).map((a) => a.name.split(' ')[0]).join(', ')}${audience.length > 4 ? ` e mais ${audience.length - 4}` : ''}`
                : 'Ninguém com telefone cadastrado neste público.'}
          </Typography>
        </Stack>
      )}

      {step === 1 && (
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Nome da campanha" placeholder={afroditeApi.segmentLabel(segment)} value={name} onChange={(e) => setName(e.target.value)} />
          <Box>
            <Typography variant="overline" color="text.secondary">
              Modelos
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {afroditeApi.MESSAGE_TEMPLATES.map((t) => (
                <Chip key={t.label} label={t.label} onClick={() => setMessage(t.text)} sx={chipSx(message === t.text)} />
              ))}
            </Box>
          </Box>
          <TextField
            label="Mensagem"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            inputRef={messageRef}
            multiline
            minRows={4}
            required
          />
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: -1 }}>
            {afroditeApi.MESSAGE_VARIABLES.map((v) => (
              <Chip key={v.key} size="small" variant="outlined" label={`+ ${v.label}`} onClick={() => insertVariable(v.key)} />
            ))}
          </Box>
          {sample && message.trim() && (
            <Box sx={{ alignSelf: 'flex-end', maxWidth: '88%', bgcolor: '#f1e3e9', borderRadius: '18px', borderBottomRightRadius: 6, px: 1.5, py: 1 }}>
              <Typography variant="caption" color="text.secondary" component="div">
                Prévia para {sample.name.split(' ')[0]}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {afroditeApi.personalize(message, sample)}
              </Typography>
            </Box>
          )}
        </Stack>
      )}
    </BottomSheet>
  )
}
