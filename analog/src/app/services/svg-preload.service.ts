import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { Injectable } from "@angular/core";
import { Pipe, PipeTransform } from '@angular/core';
import { SecurityContext } from '@angular/core'; // Import SecurityContext module


@Injectable({
  providedIn: 'root'
})
export class SvgPreloadService {
  byuLogo: SafeHtml;
  byuMedallion: SafeHtml;
}
