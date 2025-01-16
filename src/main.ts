import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { LoginComponent } from './app/pages/login/login.component';

bootstrapApplication(LoginComponent, appConfig)
  .catch((err) => console.error(err));
