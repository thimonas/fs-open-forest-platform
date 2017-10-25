import { alphanumericValidator } from '../validators/alphanumeric-validation';
import { ApplicationService } from '../../_services/application.service';
import { ApplicationFieldsService } from '../_services/application-fields.service';
import { Component, OnInit } from '@angular/core';
import { DateTimeRangeComponent } from '../fields/date-time-range.component';
import { FormGroup, FormControl, FormArray, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SpecialUseApplication } from '../../_models/special-use-application';
import { AlertService } from '../../_services/alert.service';
import { AuthenticationService } from '../../_services/authentication.service';
import * as moment from 'moment/moment';

@Component({
  providers: [ApplicationService, ApplicationFieldsService, DateTimeRangeComponent],
  selector: 'app-application-noncommercial-group',
  templateUrl: './application-noncommercial-group.component.html'
})
export class ApplicationNoncommercialGroupComponent implements OnInit {
  apiErrors: any;
  // application = new SpecialUseApplication();
  application: any = {};
  forest = 'Mt. Baker-Snoqualmie National Forest';
  mode = 'Observable';
  primaryPermitHolderSameAddress = true;
  secondaryPermitHolderSameAddress = true;
  submitted = false;
  applicantInfo: any;
  orgType: any;

  dateStatus = {
    startDateTimeValid: true,
    endDateTimeValid: true,
    startBeforeEnd: true,
    startAfterToday: true,
    hasErrors: false
  };

  public applicationForm: FormGroup;

  constructor(
    private alertService: AlertService,
    private applicationService: ApplicationService,
    private applicationFieldsService: ApplicationFieldsService,
    private authentication: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    this.applicationForm = this.formBuilder.group({
      appControlNumber: [''],
      applicationId: [''],
      createdAt: [''],
      applicantMessage: [''],
      status: [''],
      authEmail: [''],
      revisions: [''],
      district: ['11', [Validators.required]],
      region: ['06', [Validators.required]],
      forest: ['05', [Validators.required]],
      type: ['noncommercial', [Validators.required]],
      eventName: ['', [Validators.required, alphanumericValidator()]],
      signature: ['', [Validators.required, alphanumericValidator()]],
      applicantInfo: this.formBuilder.group({
        addAdditionalPhone: [false],
        addSecondaryPermitHolder: [false],
        emailAddress: ['', [Validators.required, Validators.email, alphanumericValidator()]],
        organizationName: ['', [alphanumericValidator()]],
        orgType: ['Person', Validators.required],
        primaryAddressSameAsOrganization: [true],
        primaryFirstName: ['', [Validators.required, alphanumericValidator()]],
        primaryLastName: ['', [Validators.required, alphanumericValidator()]],
        secondaryAddressSameAsPrimary: [true],
        secondaryFirstName: ['', [alphanumericValidator()]],
        secondaryLastName: ['', [alphanumericValidator()]],
        website: ['', [alphanumericValidator()]]
      })
    });
  }

  addressChangeListeners() {
    this.applicationForm.get('applicantInfo.orgType').valueChanges.subscribe(type => {
      this.orgTypeChange(type);
    });

    this.applicationForm.get('applicantInfo.primaryAddressSameAsOrganization').valueChanges.subscribe(value => {
      this.addRemoveAddress('primaryAddress', value);
    });

    this.applicationForm.get('applicantInfo.secondaryAddressSameAsPrimary').valueChanges.subscribe(value => {
      this.addRemoveAddress('secondaryAddress', value);
    });

    this.applicationForm.get('applicantInfo.addSecondaryPermitHolder').valueChanges.subscribe(value => {
      this.addSecondaryPermitHolder(value);
    });
  }

  orgTypeChange(type): void {
    if (type === 'Person') {
      this.applicationFieldsService.removeAddressValidation(
        this.applicationForm.get('applicantInfo'),
        'organizationAddress'
      );
      this.applicationForm.get('applicantInfo.organizationName').setValidators(null);
    } else if (type === 'Corporation' && !this.applicationForm.get('applicantInfo.primaryAddressSameAsOrganization')) {
      this.applicationFieldsService.removeAddressValidation(
        this.applicationForm.get('applicantInfo'),
        'primaryAddress'
      );
      this.applicationForm
        .get('applicantInfo.organizationName')
        .setValidators([Validators.required, alphanumericValidator()]);
    }
  }

  addRemoveAddress(type, value) {
    if (value) {
      this.applicationFieldsService.removeAddressValidation(this.applicationForm.get('applicantInfo'), type);
    } else {
      this.applicationFieldsService.addAddressValidation(this.applicationForm.get('applicantInfo'), type);
    }
  }

  addSecondaryPermitHolder(value) {
    if (value) {
      this.applicationForm
        .get('applicantInfo.secondaryFirstName')
        .setValidators([Validators.required, alphanumericValidator()]);
      this.applicationForm
        .get('applicantInfo.secondaryLastName')
        .setValidators([Validators.required, alphanumericValidator()]);
    } else {
      this.applicationForm.get('applicantInfo.secondaryFirstName').setValidators(null);
      this.applicationForm.get('applicantInfo.secondaryLastName').setValidators(null);
    }
  }

  updateDateStatus(dateStatus: any): void {
    this.dateStatus = dateStatus;
  }

  applicationCorrections() {
    if (this.application.applicantInfo.addAdditionalPhone) {
      this.applicationFieldsService.addAdditionalPhone(this.applicationForm.get('applicantInfo'));
    }
    if (this.application.applicantInfo.primaryAddress) {
      this.applicationFieldsService.addAddress(this.applicationForm.get('applicantInfo'), 'primaryAddress');
    }
    if (this.application.applicantInfo.organizationAddress) {
      this.applicationFieldsService.addAddress(this.applicationForm.get('applicantInfo'), 'organizationAddress');
    }
    if (this.application.applicantInfo.secondaryAddress) {
      this.applicationFieldsService.addAddress(this.applicationForm.get('applicantInfo'), 'secondaryAddress');
    }
  }

  getApplication(id) {
    this.applicationService.getOne(id, `/special-uses/noncommercial/`).subscribe(
      application => {
        this.application = application;
        this.applicationCorrections();
        this.applicationForm.setValue(application);
      },
      (e: any) => {
        this.applicationService.handleStatusCode(e[0]);
        this.apiErrors = 'The application could not be found.';
        window.scrollTo(0, 200);
      }
    );
  }

  createApplication() {
    this.applicationService
      .create(JSON.stringify(this.applicationForm.value), '/special-uses/noncommercial/')
      .subscribe(
        persistedApplication => {
          this.router.navigate([`applications/noncommercial/submitted/${persistedApplication.appControlNumber}`]);
        },
        (e: any) => {
          this.apiErrors = e;
          window.scroll(0, 0);
        }
      );
  }

  updateApplication() {
    this.applicationService.update(this.applicationForm.value, 'noncommercial').subscribe(
      (data: any) => {
        this.alertService.addSuccessMessage('Permit application was successfully updated.');
        if (this.authentication.isAdmin()) {
          this.router.navigate([`admin/applications/noncommercial/${data.appControlNumber}`]);
        } else {
          this.router.navigate([`user/applications/noncommercial/${data.appControlNumber}`]);
        }
      },
      (e: any) => {
        this.applicationService.handleStatusCode(e[0]);
      }
    );
  }

  removeUnusedData() {
    const form = this.applicationForm;
    const service = this.applicationFieldsService;
    if (form.get('applicantInfo.orgType').value === 'Person') {
      form.get('applicantInfo.organizationName').setValue(null);
      form.get('applicantInfo.website').setValue(null);
      service.removeAddress(form.get('applicantInfo'), 'organizationAddress');
    }
    if (form.get('applicantInfo.orgType').value === 'Corporation') {
      if (form.get('applicantInfo.primaryAddressSameAsOrganization').value) {
        service.removeAddress(form.get('applicantInfo'), 'primaryAddress');
      }
    }
    if (form.get('applicantInfo.secondaryAddressSameAsPrimary').value) {
      service.removeAddress(form.get('applicantInfo'), 'secondaryAddress');
    }
    if (!form.get('applicantInfo.addAdditionalPhone').value) {
      service.removeAdditionalPhone(form.get('applicantInfo'));
    }
  }

  onSubmit(form) {
    this.submitted = true;
    this.applicationFieldsService.touchAllFields(this.applicationForm);
    if (!form.valid || this.dateStatus.hasErrors) {
      this.applicationFieldsService.scrollToFirstError();
    } else {
      this.removeUnusedData();
      if (this.applicationFieldsService.getEditApplication()) {
        this.updateApplication();
      } else {
        this.createApplication();
      }
    }
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.getApplication(params['id']);
        this.applicationFieldsService.setEditApplication(true);
      } else {
        this.applicationFieldsService.setEditApplication(false);
      }
    });
    this.addressChangeListeners();
  }
}
