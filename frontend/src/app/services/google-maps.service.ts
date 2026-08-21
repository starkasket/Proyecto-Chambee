import { Injectable } from '@angular/core';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { environment } from '../../environments/environment';


export interface AddressComponentNew {
  longText: string;
  shortText: string;
  types: string[];
}

export interface DireccionGeocodificada {
  latitud: number;
  longitud: number;
  direccionFormateada: string;
  coincidenciaExacta: boolean;
  tipoUbicacion: string;
}


export interface DireccionCompleta {
  calle: string;
  numero: string;
  colonia: string;
  ciudad: string;
  estado: string;
  pais: string;
  codigoPostal: string;
  latitud: number;
  longitud: number;
  direccionFormateada: string;
}

export interface ConfiguracionAutocomplete {
  contenedorId: string;
  regionCodes?: string[];
  restriction?: google.maps.LatLngBoundsLiteral;
  onDireccionSeleccionada: (
    direccion: DireccionCompleta
  ) => void | Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {

  private geocoder?: google.maps.Geocoder;

  private loaded = false;

  private autocomplete?: HTMLElement;

  constructor() {
    setOptions({
      key: environment.googleMapsApiKey,
      v: "weekly"
    });
  }

  private async init() {

    if (this.loaded) return;

    /*  await importLibrary("places") */

    await Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("geocoding")
    ]);

    this.loaded = true;

    this.geocoder = new google.maps.Geocoder();
  }

  async inicializarMapa() {
    await this.init();
  }

  // obtenerDireccionporCoordenadas(latitud: number, longitud: number): Promise<DireccionCompleta>

  async crearAutocomplete(
    config: ConfiguracionAutocomplete
  ) {

    await this.init();

    const places = await google.maps.importLibrary("places");

    const autocomplete = new places.PlaceAutocompleteElement({
      includedRegionCodes: config.regionCodes,
      locationRestriction: config.restriction
    });

    const contenedor = document.getElementById(config.contenedorId);

    if (!contenedor) return;

    contenedor.innerHTML = "";

    contenedor.appendChild(
      autocomplete
    );

    autocomplete.addEventListener(
      "gmp-select", async (event: any) => {
        const place = event.placePrediction.toPlace();

        await place.fetchFields({
          fields: [
            "formattedAddress",
            "location",
            "addressComponents"
          ]
        });

        const direccion = await this.procesarPlaceSeleccionado(
          place
        );

        await config.onDireccionSeleccionada(
          direccion
        );
      });

    this.autocomplete = autocomplete
  }
  private obtenerComponente(
    componentes: AddressComponentNew[],
    tipos: string[],
  ): string {

    for (const tipo of tipos) {
      const encontrado = componentes.find(c => c.types.includes(tipo));

      if (encontrado) {
        return encontrado.longText;
      }
    }
    return '';

  }

  //  |-----------------------------------------|
  //  |                 MAPA                    |
  //  |-----------------------------------------|

  async procesarPlaceSeleccionado(place: any): Promise<DireccionCompleta> {
    const componentes: AddressComponentNew[] = place.addressComponents ?? [];

    const latitud = typeof place.location?.lat === "function" ? place.location.lat() : place.location?.lat;

    const longitud = typeof place.location?.lng === "function" ? place.location.lng() : place.location?.lng;

    return {
      calle: this.obtenerComponente(componentes, ["route"]),
      numero: this.obtenerComponente(componentes, ["street_number"]),
      colonia: this.obtenerComponente(componentes, ["sublocality", "sublocality_level_1", "neighborhood"]),
      ciudad: this.obtenerComponente(componentes, ["locality", "administrative_area_level_2"]),
      estado: this.obtenerComponente(componentes, ["administrative_area_level_1"]),
      pais: this.obtenerComponente(componentes, ["country"]),
      codigoPostal: this.obtenerComponente(componentes, ["postal_code"]),
      latitud,
      longitud,
      direccionFormateada: place.formattedAddress ?? place.formatted_address ?? ""
    };

  }


  async obtenerDireccionPorCoordenadas(latitud: number, longitud: number): Promise<DireccionCompleta | null> {
    await this.init();

    if (!this.geocoder) {
      throw new Error("El Geocoder no ha sido inicializado.");
    };

    try {
      const response = await this.geocoder.geocode({
        location: {
          lat: latitud,
          lng: longitud
        },
        region: 'mx'
      });

      if (!response.results?.length) {
        return null;
      }

      const resultado = response.results[0];

      const direccion: DireccionCompleta = {
        calle: '',
        numero: '',
        colonia: '',
        ciudad: '',
        estado: '',
        pais: '',
        codigoPostal: '',
        latitud,
        longitud,
        direccionFormateada:
          resultado.formatted_address ?? ''
      };

      for (const componente of resultado.address_components) {
        const tipos = componente.types;

        if (tipos.includes('route')) {
          direccion.calle = componente.long_name;
        }

        if (tipos.includes('street_number')) {
          direccion.numero = componente.long_name;
        }

        if (
          tipos.includes('neighborhood') ||
          tipos.includes('sublocality_level_1') ||
          tipos.includes('sublocality')
        ) {
          if (!direccion.colonia) {
            direccion.colonia = componente.long_name;
          }
        }

        if (tipos.includes('locality')) {
          direccion.ciudad = componente.long_name;
        }

        if (
          !direccion.ciudad &&
          tipos.includes('administrative_area_level_2')
        ) {
          direccion.ciudad = componente.long_name;
        }

        if (
          tipos.includes('administrative_area_level_1')
        ) {
          direccion.estado = componente.long_name;
        }

        if (tipos.includes('country')) {
          direccion.pais = componente.long_name;
        }

        if (tipos.includes('postal_code')) {
          direccion.codigoPostal =
            componente.long_name;
        }
      }

      return direccion;
    } catch (error) {
      console.error('Error en reverse geocoding: ', error)
    
      return null;
    }



  }







  normalizar(texto: string): string {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim();
  }

  sonIguales(a: string, b: string): boolean {

    const aa = this.normalizar(a);
    const bb = this.normalizar(b);

    if (aa === bb) {
      return true;
    }

    if (aa.includes(bb) || bb.includes(aa)) {
      return true;
    }

    return false;

  }

  sonParecidas(a: string, b: string): boolean {

    const aa = this.normalizar(a);
    const bb = this.normalizar(b);

    return aa.includes(bb) || bb.includes(aa);
  }

  private esParecido(a: string, b: string): boolean {

    const x = this.normalizar(a);
    const y = this.normalizar(b);

    return x.includes(y) || y.includes(x);

  }



  extraerDireccion(place: google.maps.Place) {


    const p = place as any;

    const componentes =
      p.addressComponents ?? [];

    const latitud =
      typeof p.location?.lat === "function"
        ? p.location.lat()
        : p.location?.lat;

    const longitud =
      typeof p.location?.lng === "function"
        ? p.location.lng()
        : p.location?.lng;


    return {

      calle:
        this.obtenerComponente(componentes, ["route"]),

      numero:
        this.obtenerComponente(componentes, ["street_number"]),

      colonia:
        this.obtenerComponente(componentes, ["sublocality", "sublocality_level_1",
          "neighborhood"]),

      ciudad:
        this.obtenerComponente(componentes, ["locality", "administrative_area_level_2"]),

      estado:
        this.obtenerComponente(
          componentes,
          ["administrative_area_level_1"]
        ),

      codigoPostal:
        this.obtenerComponente(
          componentes,
          ["postal_code"]
        ),

      latitud,

      longitud,

      direccionFormateada:
        p.formattedAddress

    };

  }


  public coincideConSepomex(
    direccion: DireccionCompleta,
    registro: any
  ): boolean {

    return (

      direccion.codigoPostal === registro.cp &&

      this.sonIguales(
        direccion.estado,
        registro.estado
      ) &&

      this.sonIguales(
        direccion.ciudad,
        registro.ciudad
      ) &&

      this.esParecido(
        direccion.colonia,
        registro.colonia
      )

    );

  }









  async geocodificarDireccion(direccion: string): Promise<DireccionGeocodificada> {

    await this.init();

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(
        {
          address: direccion,
          region: 'mx'
        },
        (results, status) => {
          if (
            status === google.maps.GeocoderStatus.OK &&
            results &&
            results.length
          ) {
            const lugar = results[0];



            resolve({
              latitud: lugar.geometry.location.lat(),
              longitud: lugar.geometry.location.lng(),
              direccionFormateada: lugar.formatted_address,
              coincidenciaExacta: !lugar.partial_match,
              tipoUbicacion: lugar.geometry.location_type
            });



          } else {
            reject(status);
          }
        }
      )
    })
  }
}
