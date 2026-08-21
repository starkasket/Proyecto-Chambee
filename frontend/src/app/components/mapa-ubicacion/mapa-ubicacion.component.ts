import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  Output,
  ViewChild,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { importLibrary } from '@googlemaps/js-api-loader';

import {
  GoogleMapsService,
  DireccionCompleta
} from '../../services/google-maps.service';

@Component({
  selector: 'app-mapa-ubicacion',
  standalone: true,
  imports: [],
  templateUrl: './mapa-ubicacion.component.html',
  styleUrl: './mapa-ubicacion.component.css'
})
export class MapaUbicacionComponent
  implements AfterViewInit, OnChanges {

  @ViewChild('mapa', { static: true })
  mapaElement!: ElementRef<HTMLDivElement>;

  @Output()
  ubicacionSeleccionada = new EventEmitter<DireccionCompleta>();

  @Input() latitudInicial: number | null = null;
  @Input() longitudInicial: number | null = null;
  @Input() soloLectura = false;
 

  private mapa?: google.maps.Map;

  private marcador?:
    google.maps.marker.AdvancedMarkerElement;

  private mapaListo = false;

  constructor(
    private googleMaps: GoogleMapsService,
    private ngZone: NgZone
  ) { }


  async ngAfterViewInit() {

    await this.googleMaps.inicializarMapa();

    const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;

    const { AdvancedMarkerElement } = await importLibrary('marker') as google.maps.MarkerLibrary;

    const lat = this.latitudInicial ?? 21.0190;
    const lng = this.longitudInicial ?? -101.2574;

    this.mapa = new Map(this.mapaElement.nativeElement,
      {
        center: {
          lat,
          lng
        },

        zoom: this.latitudInicial !== null && this.longitudInicial !== null
          ? 15
          : 8,


        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        keyboardShortcuts: false,


        mapId: '4d41e1ac703e1803794c10f6'
      }
    );

    this.mapaListo = true;

    if (
      this.latitudInicial !== null &&
      this.longitudInicial !== null
    ) {

      this.colocarMarcadorSinGeocodificar(
        AdvancedMarkerElement,
        this.latitudInicial,
        this.longitudInicial
      );
    }

    if (!this.soloLectura) {
      this.mapa.addListener(
      'click',
      (event: google.maps.MapMouseEvent) => {
        console.log('FOCO:', document.activeElement);
        console.log('DIALOGO:', document.querySelector('.zlDrU-basic-dialog-element'));
        console.log('CLICK DEL MAPA');
        if (!event.latLng) {
          return;
        }

        const lat = event.latLng.lat();

        const lng = event.latLng.lng();

        this.colocarMarcador(
          AdvancedMarkerElement,
          lat,
          lng
        );
      }
    );
    }
    
  }

  private colocarMarcador(
    AdvancedMarkerElement:
      typeof google.maps.marker.AdvancedMarkerElement,
    lat: number,
    lng: number
  ) {

    if (!this.mapa) {
      return;
    }

    if (!this.marcador) {

      this.marcador =
        new AdvancedMarkerElement({
          map: this.mapa,

          position: {
            lat,
            lng
          },

          gmpDraggable: !this.soloLectura
        });

      this.marcador.addListener(
        'dragend',
        () => {

          const posicion =
            this.marcador?.position;

          if (!posicion) {
            return;
          }

          const lat =
            typeof posicion.lat === 'function'
              ? posicion.lat()
              : posicion.lat;

          const lng =
            typeof posicion.lng === 'function'
              ? posicion.lng()
              : posicion.lng;

          if (
            lat === undefined ||
            lng === undefined
          ) {
            return;
          }

          this.actualizarUbicacion(
            lat,
            lng
          );
        }
      );

    } else {

      this.marcador.position = {
        lat,
        lng
      };
    }

    this.actualizarUbicacion(
      lat,
      lng
    );
  }

   ngOnChanges(changes: SimpleChanges) {
    if (!this.mapaListo || !this.mapa) {
      return;
    }

    if (changes['latitudInicial'] ||
      changes['longitudInicial']) {
      if (
        this.latitudInicial === null ||
        this.longitudInicial === null
      ) {
        return;
      }

      const lat = this.latitudInicial;
      const lng = this.longitudInicial;

      this.mapa.setCenter({
        lat,
        lng
      });

      this.mapa.setZoom(15);

      importLibrary('marker').then((lib) => {

        const { AdvancedMarkerElement } =
          lib as google.maps.MarkerLibrary;

        this.colocarMarcadorSinGeocodificar(
          AdvancedMarkerElement,
          lat,
          lng
        );

      });
    }
  }

  private colocarMarcadorSinGeocodificar(AdvancedMarkerElement:
    typeof google.maps.marker.AdvancedMarkerElement,
    lat: number,
    lng: number) {
    if (!this.mapa) {
      return;
    }

    if (!this.marcador) {

      this.marcador =
        new AdvancedMarkerElement({
          map: this.mapa,

          position: {
            lat,
            lng
          },

          gmpDraggable: !this.soloLectura
        });

      this.marcador.addListener(
        'dragend',
        () => {

          const posicion =
            this.marcador?.position;
          if (!posicion) {
            return;
          }

          const lat =
            typeof posicion.lat === 'function'
              ? posicion.lat()
              : posicion.lat;

          const lng =
            typeof posicion.lng === 'function'
              ? posicion.lng()
              : posicion.lng;

          if (
            lat === undefined ||
            lng === undefined
          ) {
            return;
          }

          this.actualizarUbicacion(
            lat,
            lng
          );
        }
      );

    } else {

      this.marcador.position = {
        lat,
        lng
      };
    }
  }

  private async actualizarUbicacion(
    lat: number,
    lng: number
  ) {

    const direccion =
      await this.googleMaps
        .obtenerDireccionPorCoordenadas(
          lat,
          lng
        );

    if (!direccion) {
      console.warn(
        'No se encontró una dirección para las coordenadas.'
      );
      return;
    }

    this.ngZone.run(() => {

      this.ubicacionSeleccionada.emit(
        direccion
      );

    });
  }
}