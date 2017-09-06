import { Component, OnInit } from '@angular/core';
import { environment } from '../environments/environment';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AuthenticationService } from './_services/authentication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  version = environment.version;
  buildDate = environment.buildDate;
  currentRoute: string;
  apiurl = environment.apiUrl;
  userEmail: string;

  constructor(private router: Router, private authentication: AuthenticationService) {
    router.events.subscribe(scroll => {
      // Scroll to top of page on route change
      window.scrollTo(0, 0);
    });
  }

  gotoHashtag(fragment: string, event) {
    event.preventDefault();
    const element = document.querySelector('#' + fragment);
    if (element) {
      element.scrollIntoView();
      document.getElementById(fragment).focus();
    }
  }

  isAuthenticated() {
    this.userEmail = this.authentication.getAuthenticatedUser();
  }

  ngOnInit() {
    window.scrollTo(0, 0);
  }
}
