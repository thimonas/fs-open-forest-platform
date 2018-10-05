import { Component, DoCheck, Input } from '@angular/core';
import { FilterFunction, FileLikeObject, FileUploader } from 'ng2-file-upload';
import { FormControl } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApplicationFieldsService } from '../_services/application-fields.service';
import { FileUploadService } from '../_services/file-upload.service';

function minFileSizeFilter(min: Number): FilterFunction {
  return {
    name: 'minFileSize',
    fn: item => this.size > min
  };
}

function fileExtensionFilter(extensions: string[]): FilterFunction {
  return {
    name: 'fileExtension',
    fn: item => {
      const match = item.name.match(/\.(\w+)$/);
      if (!match || !match[1]) {
        return false;
      }

      const ext = match[1];
      return extensions.includes(ext);
    }
  };
}

// https://github.com/18F/fs-open-forest-middlelayer-api/blob/69519fb32a22125ffde0e0aecce90dd745021d11/src/controllers/translate.json
// The valid extensions depend on the application.
const DEFAULT_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'rtf',
];


@Component({
  selector: 'app-file-upload-field',
  templateUrl: './file-upload.component.html'
})
export class FileUploadComponent implements DoCheck {
  @Input() applicationId: number;
  @Input() name: string;
  @Input() type: string;
  @Input() uploadFiles: boolean;
  @Input() required: boolean;
  @Input() checkFileUploadHasError: boolean;
  @Input() field: FormControl;
  @Input() allowedFileExtensions: string[];
  @Input() allowXls: boolean;
  @Input() allowImg: boolean;

  // https://github.com/18F/fs-open-forest-middlelayer-api/blob/73101d457284ccfeeb9a1e4354eb786d21d84a15/src/controllers/fileValidation.js#L20
  // We allow all the mimetypes and instead focus our filtering on the file extension.
  allowedMimeType = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/rtf',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];
  errorMessage: string;
  maxFileSize = 10 * 1024 * 1024;
  uploader: FileUploader;

  constructor(public fieldsService: ApplicationFieldsService, public fileUploadService: FileUploadService) {
    if (!this.allowedFileExtensions.length) {
      this.allowedFileExtensions = DEFAULT_FILE_EXTENSIONS;
    }

    this.uploader = new FileUploader({
      url: environment.apiUrl + 'permits/applications/special-uses/temp-outfitter/file',
      maxFileSize: this.maxFileSize,
      allowedMimeType: this.allowedMimeType,
      queueLimit: 2,
      filters: [
        minFileSizeFilter(0),
        fileExtensionFilter(this.allowedFileExtensions)
      ]
    });
    this.uploader.onWhenAddingFileFailed = (item, filter, options) =>
      this.onWhenAddingFileFailed(item, filter, options);
    this.uploader.onAfterAddingFile = fileItem => this.onAfterAddingFile(this.uploader);
    this.uploader.onCompleteItem = (item: any, response: any, status: any, headers: any) =>
      this.onCompleteItem(item, response, status, headers);
    this.uploader.onErrorItem = (item: any, response: any, status: any, headers: any) =>
      this.onErrorItem(item, response, status, headers);
  }

  onErrorItem(item, response, status, headers) {
    this.fileUploadService.setFileUploadError(true);
    item._onBeforeUpload();
  }

  onCompleteItem(item, response, status, headers) {
    this.fileUploadService.removeOneFile();
  }

  onAfterAddingFile(uploader) {
    if (uploader.queue.length > 0) {
      this.errorMessage = '';
      this.fileUploadService.addOneFile();
    }
    if (uploader.queue.length > 1) {
      uploader.removeFromQueue(uploader.queue[0]);
      this.fileUploadService.removeOneFile();
    }
    if (uploader.queue.length > 0) {
      this.field.patchValue(uploader.queue[0].file.name);
      this.field.markAsTouched();
      this.field.updateValueAndValidity();
      this.field.setErrors(null);
    }
  }

  onWhenAddingFileFailed(item: FileLikeObject, Filter: FilterFunction, options: any) {
    if (this.uploader.queue.length > 0) {
      this.uploader.removeFromQueue(this.uploader.queue[0]);
    }
    switch (Filter.name) {
      case 'fileSize':
        this.errorMessage = `Maximum upload size exceeded (${item.size} of ${this.maxFileSize} allowed)`;
        break;
      case 'mimeType':
        this.errorMessage = `The file type you selected is not allowed. The allowed file types are ${this.allowedMimeType.join(', ')}`;
        break;
      case 'minFileSize':
        this.errorMessage = `The file cannot be empty`;
        break;
      case 'fileExtension':
        this.errorMessage = `The file extension you selected is not allowed. The allowed file extensions are ${this.allowedFileExtensions.join(', ')}`;
        break;
      default:
        this.errorMessage = `Unknown error (filter is ${Filter.name})`;
    }

    this.field.markAsTouched();
    this.field.updateValueAndValidity();
    if (this.errorMessage) {
      this.field.setErrors({ error: this.errorMessage });
    }
  }

  clickInput(event) {
    event.preventDefault();
    document.getElementById(`${this.type}`).click();
  }

  ngDoCheck() {
    this.uploader.options.additionalParameter = { applicationId: this.applicationId, documentType: this.type };
    if (this.uploadFiles) {
      for (const item of this.uploader.queue) {
        item.upload();
      }
    }
    if (this.checkFileUploadHasError) {
      if (this.required && !this.uploader.queue[0] && !this.field.value) {
        this.errorMessage = `${this.name} is required.`;
      }
    }
  }
}
