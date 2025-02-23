//INFO: template usado: https://github.com/mui-org/material-ui/blob/master/docs/src/pages/getting-started/templates/sign-in/SignIn.js
import React from 'react';
import Copyright from '../../components/Copyright';

import Paper from '@material-ui/core/Paper';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Link from '@material-ui/core/Link';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import IconoLogo from '../../components/Logo';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';

const CFG= { //TODO: mover a un modulo todo para esto
	PodemosAprenderLoginUrl: "https://si.podemosaprender.org/login/",
}

const useStyles = makeStyles((theme) => ({
	paper: {
		marginTop: theme.spacing(8),
		padding: theme.spacing(3),
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.primary.main.light,
	},
	form: {
		width: '100%', // Fix IE 11 issue.
		marginTop: theme.spacing(1),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
}));

export default function LoginTemplate(props) {
  const classes = useStyles();

  return (
    <Container maxWidth="xs">
      <CssBaseline />
      <Paper className={classes.paper}>
        <Avatar className={classes.avatar}>
          <IconoLogo color='#999'/>
        </Avatar>
        <Typography variant="h5">
          Iniciar Sesión
        </Typography>
				<Typography>
					<Link href={ props.servidorApi }>{ props.servidorApi }</Link>
				</Typography>
        <form className={classes.form} noValidate>
          <TextField
            onChange={props.cuandoCambiaInput}
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="participante"
            label="Participante"
            autoFocus
          />
          <TextField
            onChange={props.cuandoCambiaInput}
            variant="outlined"
            margin="normal"
            required
            fullWidth
            label="Contraseña"
            type="password"
            id="password"
          />
          <Button
            onClick={props.cuandoPideLogin}
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Iniciar sesion
          </Button>
          <Grid container>
            <Grid item xs>
              <Link href={CFG.PodemosAprenderLoginUrl} variant="body2">
                ¿Olvidaste la contraseña?
              </Link>
            </Grid>
            <Grid item>
              <Link href={CFG.PodemosAprenderLoginUrl} variant="body2" target="_blank">
                {"Registrate"}
              </Link>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
