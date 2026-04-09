import {
  Alert,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

function NoCobroAuthorizationFields({
  enabled,
  onToggle,
  form,
  onChange,
  title = "No cobrar",
  helperText = "Esta operacion se registrara como no cobrada y quedara pendiente de validacion al cierre de caja.",
  requireAdminFields = false,
}) {
  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Checkbox checked={enabled} onChange={(event) => onToggle(event.target.checked)} />}
        label={title}
      />

      {enabled && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 3,
            borderColor: "warning.main",
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(15,23,42,0.45))",
          }}
        >
          <Stack spacing={2}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              {helperText}
            </Alert>

            <TextField
              fullWidth
              label="Motivo del no cobro"
              value={form.motivo}
              onChange={(event) => onChange("motivo", event.target.value)}
              multiline
              minRows={2}
            />

            {requireAdminFields && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Autorizacion administrativa
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Usuario admin"
                      value={form.admin_username}
                      onChange={(event) => onChange("admin_username", event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Password admin"
                      value={form.admin_password}
                      onChange={(event) => onChange("admin_password", event.target.value)}
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default NoCobroAuthorizationFields;
