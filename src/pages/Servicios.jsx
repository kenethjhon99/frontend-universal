import LocalCarWashIcon from "@mui/icons-material/LocalCarWash";
import BuildIcon from "@mui/icons-material/Build";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  Box,
  Button,
  Container,
  Paper,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import {
  getSummaryCardSx,
  getSummaryIconWrapSx,
  getSummaryValueSx,
} from "../utils/summaryCardStyles";

function Servicios() {
  const theme = useTheme();
  const serviceCards = [
    {
      title: "Autolavado",
      description: "Gestiona servicios de lavado, recepcion de vehiculos y seguimiento rapido.",
      to: "/carwash/autolavado",
      icon: LocalCarWashIcon,
      tone: "primary",
    },
    {
      title: "Reparacion",
      description: "Administra diagnosticos, trabajos de taller y control de mantenimientos.",
      to: "/carwash/reparacion",
      icon: BuildIcon,
      tone: "secondary",
    },
    {
      title: "Tienda",
      description: "Registra ventas de productos exclusivos de tienda sin mezclar el catalogo general del POS.",
      to: "/servicios/tienda",
      icon: StorefrontIcon,
      tone: "success",
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={(currentTheme) => ({
            ...getSummaryCardSx(currentTheme, "primary", { minHeight: 0 }),
            mb: 3,
          })}
        >
          <Stack spacing={1.5}>
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: "0.16em" }}>
              Operacion diaria
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              Servicios
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Selecciona el area de trabajo para autolavado, reparacion o venta de tienda con una interfaz mas clara, visual y rapida.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
              <Chip color="primary" variant="outlined" label="Autolavado" />
              <Chip color="secondary" variant="outlined" label="Reparacion" />
              <Chip color="success" variant="outlined" label="Tienda" />
            </Stack>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
          }}
        >
          {serviceCards.map((service) => (
            <Paper
              key={service.title}
              component={RouterLink}
              to={service.to}
              elevation={3}
              sx={(currentTheme) => ({
                ...getSummaryCardSx(currentTheme, service.tone, {
                  interactive: true,
                  minHeight: 248,
                }),
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                textDecoration: "none",
                color: "inherit",
              })}
            >
              <Stack spacing={2}>
                <Box sx={getSummaryIconWrapSx(theme, service.tone)}>
                  <service.icon sx={{ fontSize: 34 }} />
                </Box>

                <Box>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    gutterBottom
                    sx={getSummaryValueSx(theme, service.tone)}
                  >
                    {service.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {service.description}
                  </Typography>
                </Box>
              </Stack>

              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  alignSelf: "flex-start",
                  mt: 3,
                  borderRadius: 999,
                  px: 3,
                  fontWeight: 700,
                  boxShadow: "none",
                }}
              >
                Ir a {service.title}
              </Button>
            </Paper>
          ))}
        </Box>
      </Box>
    </Container>
  );
}

export default Servicios;
