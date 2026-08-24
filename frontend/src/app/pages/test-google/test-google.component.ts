import { Component, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { importLibrary } from '@googlemaps/js-api-loader';
import { GoogleMapsService } from '../../services/google-maps.service';


@Component({
  selector: 'app-test-google',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-google.component.html',
  styleUrl: './test-google.component.css',
  schemas: []
})
export class TestGoogleComponent implements AfterViewInit {

  @ViewChild('mapa', { static: true })
  mapaElement!: ElementRef<HTMLDivElement>;

  private mapa?: google.maps.Map;
  private marcador?: google.maps.marker.AdvancedMarkerElement;


  latitud: number | null = null;
  longitud: number | null = null;
  calle: string = '';
  numeroExterior: string = '';
  colonia: string = '';
  ciudad: string = '';
  estado: string = '';
  codigoPostal: string = '';
  pais: string = '';
  direccionCompleta: string = '';

  constructor(private googleMaps: GoogleMapsService, private ngZone: NgZone) { }

  async ngAfterViewInit() {

    await this.googleMaps.inicializarMapa();

    const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;

    const { AdvancedMarkerElement } = await importLibrary('marker') as google.maps.MarkerLibrary;




    this.mapa = new Map(this.mapaElement.nativeElement, {
      center: {
        lat: 21.0190,
        lng: -101.2574
      },
      zoom: 8,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      mapId: '4d41e1ac703e1803794c10f6'
    });

    this.mapa.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      this.colocarMarcador(AdvancedMarkerElement, lat, lng);

    });
  }
/* 
  private async obtenerDireccion(lat: number, lng: number) {
    if (!this.geocoder) return;

    try {
      const response = await this.geocoder.geocode({
        location: {
          lat, lng
        }
      });

      console.log('Respuesta Geocoder', response);

      if (!response.results || response.results.length === 0) {
        console.log('No se encontró una dirección para estas coordenadas.');
        return;
      }

      const resultado = response.results[0];

      console.log('Dirección completta:', resultado.formatted_address);
      console.log('Componentes: ', resultado.address_components);

      this.ngZone.run(() => {

        this.calle = '';
        this.numeroExterior = '';
        this.colonia = '';
        this.ciudad = '';
        this.estado = '';
        this.codigoPostal = '';
        this.pais = '';
        this.direccionCompleta = resultado.formatted_address;

        for (const componente of resultado.address_components) {
          const tipos = componente.types;

          if (tipos.includes('route')) {
            this.calle = componente.long_name;
          }

          if (tipos.includes('street_number')) {
            this.numeroExterior = componente.long_name;
          }

          if (tipos.includes('neighborhood')) {
            this.colonia = componente.long_name;
          }

          if (!this.colonia && tipos.includes('sublocality_level_1')) {
            this.colonia = componente.long_name;
          }

          if (!this.colonia && tipos.includes('sublocality')) {
            this.colonia = componente.long_name;
          }

          if (tipos.includes('locality')) {
            this.ciudad = componente.long_name;
          }


          if (tipos.includes('administrative_area_level_1')) {
            this.estado = componente.long_name;
          }

          if (tipos.includes('postal_code')) {
            this.codigoPostal = componente.long_name;
          }

          if (tipos.includes('country')) {
            this.pais = componente.long_name;
          }
        }


        console.log('Calle:', this.calle);
        console.log('Número:', this.numeroExterior);
        console.log('Colonia:', this.colonia);
        console.log('Ciudad:', this.ciudad);
        console.log('Estado:', this.estado);
        console.log('Código postal:', this.codigoPostal);
        console.log('País:', this.pais);
      });


    } catch (error) {
      console.error('Error en reverse geocoding', error)
    }
  } */

  private colocarMarcador(AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement,
    lat: number, lng: number) {
    if (!this.mapa) return;

    if (!this.marcador) {
      this.marcador = new AdvancedMarkerElement({
        map: this.mapa,
        position: {
          lat,
          lng
        },
        gmpDraggable: true
      });

      this.marcador.addListener('dragend', () => {
        // console.log("DRAGEND DETECTADO");

        const posicion = this.marcador?.position;

        //        console.log("Posición: ", posicion);

        if (!posicion) return;

        const lat = typeof posicion.lat === 'function' ? posicion.lat() : posicion.lat;

        const lng = typeof posicion.lng === 'function' ? posicion.lng() : posicion.lng;

        /*  console.log('Nueva latitud:', lat);
         console.log('Nueva longitud:', lng); */

        this.actualizarCoordenadas(lat, lng);
      });

    } else {
      this.marcador.position = { lat, lng };
    }

    this.actualizarCoordenadas(lat, lng);
  }

  private async actualizarCoordenadas(lat: number, lng: number) {
    this.ngZone.run(() => {
      this.latitud = lat;
      this.longitud = lng;


      console.log('Latitud: ', lat);
      console.log('Longitud: ', lng);
    });

    const direccion = await this.googleMaps.obtenerDireccionPorCoordenadas(
      lat, lng
    );

    if (!direccion) {
      console.warn('NO se encontró una dirección para las coordenadas.');
      return;
    }

    this.ngZone.run(() => {
      this.calle = direccion.calle;
      this.numeroExterior = direccion.numero;
      this.colonia = direccion.colonia;
      this.ciudad = direccion.ciudad;
      this.estado = direccion.estado;
      this.codigoPostal = direccion.codigoPostal;
      this.pais = direccion.pais;

      this.direccionCompleta =
        direccion.direccionFormateada;
    })
    // this.obtenerDireccion(lat, lng);
  }





  /*  constructor(
     private googleMaps: GoogleMapsService
   ) { } */



  /* async ngOnInit(): Promise<void> {
    await google.maps.importLibrary("maps");
    const places = await google.maps.importLibrary("places");
    const autocomplete =
      new places.PlaceAutocompleteElement({

        includedRegionCodes: ['mx']

      });

    document
      .getElementById("autocomplete")
      ?.appendChild(autocomplete);

    autocomplete.addEventListener(
      "gmp-select",
      async (event: any) => {

        const prediction = event.placePrediction;
        console.log(prediction);

        const place = prediction.toPlace();


        await place.fetchFields({
          fields: [
            "displayName",
            "formattedAddress",
            "location",
            "addressComponents"
          ]
        });

        const direccion = await this.googleMaps.procesarPlaceSeleccionado(place);

        console.log(direccion);

        console.log("-------");
        
         console.log(place.addressComponents?.[0]);
          */
  /* 
          console.log(place.formattedAddress);
  
          console.log(place.location?.lat());
  
          console.log(place.location?.lng());
  
          console.log(place.addressComponents);
  
          console.log("LULULULULULUL");
  
  
          console.log(place.addressComponents[0]);
          console.log(place.addressComponents[0].types);
          console.log(place.addressComponents[0].longText);
          console.log(place.addressComponents[0].shortText);
  
  
          console.log("SCARLET POLICE");
  
          console.log(JSON.stringify(place.addressComponents, null, 2));
  
          console.log(place.addressComponents?.[0]);
          console.log(place.addressComponents?.[0].types);
          console.log(place.addressComponents?.[0].longText);
          console.log(place.addressComponents?.[0].shortText); */

  /*       }
      );
    } */




  /* 
    async probar() {
      try {
        const resultado = await this.googleMaps.geocodificarDireccion("Universidad Tecnológica de San Miguel de Allende, Guanajuato");
  
        console.log(resultado);
  
  
      }
      catch (error) {
        console.error(error);
      }
    }
   */

}
