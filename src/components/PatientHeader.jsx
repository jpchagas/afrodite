import React from 'react'
import { Box, Skeleton, Typography } from '@mui/material'
import ScreenHeader from './ScreenHeader.jsx'
import PersonAvatar from './PersonAvatar.jsx'
import StatusChip from './StatusChip.jsx'
import ClinicalAlerts from './ClinicalAlerts.jsx'

/**
 * Cabeçalho das telas de paciente: botão voltar, título da tela e o resumo
 * da paciente (avatar, nome, idade/CPF, status). `children` vai abaixo
 * (normalmente as abas de seção). Com `error`, o resumo não é exibido.
 */
export default function PatientHeader({ patient, error, title, onBack, actions, hideAlerts = false, children }) {
  return (
    <ScreenHeader title={title} back onBack={onBack} actions={actions}>
      {!error && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {patient ? (
          <PersonAvatar name={patient.name} size={60} />
        ) : (
          <Skeleton variant="circular" width={60} height={60} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {patient ? (
            <>
              <Typography variant="h5" component="h2" noWrap>
                {patient.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                {[patient.age && `${patient.age} anos`, patient.cpf && `CPF ${patient.cpf}`]
                  .filter(Boolean)
                  .join(' • ')}
              </Typography>
              <StatusChip status={patient.status} sx={{ mt: 0.75 }} />
            </>
          ) : (
            <>
              <Skeleton width="60%" height={30} />
              <Skeleton width="45%" />
            </>
          )}
        </Box>
      </Box>
      )}
      {!error && !hideAlerts && patient?.clinicalAlerts?.length > 0 && <ClinicalAlerts alerts={patient.clinicalAlerts} compact sx={{ mt: 1.5 }} />}
      {children && <Box sx={{ mt: 1.5 }}>{children}</Box>}
    </ScreenHeader>
  )
}
