import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { MapaUbicacionComponent } from '../../components/mapa-ubicacion/mapa-ubicacion.component';
import { GoogleMapsService } from '../../services/google-maps.service';
import { DireccionCompleta } from '../../services/google-maps.service';

@Component({
  selector: 'app-employer-register',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, MapaUbicacionComponent],
  templateUrl: './employerRegister.component.html',
  styleUrl: './employerRegister.component.css'
})
export class EmployerRegisterComponent {

  form = {
    nombre_empresa: '',
    correo_electronico: '',
    contrasena: '',
    contrasena_verificar: '',
    pais: 'México',
    estado: '',
    ciudad: '',
    colonia: '',
    calle: '',
    numero_exterior: '',
    direccion_formateada: '',
    codigo_postal: '',
    telefono: '',
    rfc: '',
    descripcion: '',
    latitud: null as number | null,
    longitud: null as number | null
  };

  mostrarPassword = false;
  mostrarPassword2 = false;
  sepomex: any[] = [];
  colonias: string[] = [];
  buscandoCP = false;

  erroresDuplicados = {
    correo_electronico: false,
    rfc: false,
    nombre_empresa: false
  };

  // --- CONTROL DE MODALES ---
  modalMensaje = '';
  modalMensajeExito = '';


  // ☆☆☆ Flag para ubicación ☆☆☆
   ubicacionSeleccionadaFlag = false;

  constructor(private api: ApiService, private router: Router, private http: HttpClient, private googleMaps: GoogleMapsService) {}


  async ngOnInit(){
    this.api.getSepomex().subscribe(data => this.sepomex = data);
  }
  // --- MODAL DE ERROR ---
  mostrarModal(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalAlerta');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModal() {
    const modal = document.getElementById('modalAlerta');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  // --- MODAL DE ÉXITO ---
  mostrarModalExito(mensaje: string) {
    this.modalMensajeExito = mensaje;
    const modal = document.getElementById('modalSaludo');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModalExito() {
    const modal = document.getElementById('modalSaludo');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
    // Redirige a home-employer después de registrar la empresa
    this.router.navigate(['/home-employer']);
  }

  // --- BUSCAR CÓDIGO POSTAL ---
  buscarCP() {
    const cp = this.form.codigo_postal.trim();
    if (cp.length !== 5) return;

    this.buscandoCP = true;
    this.http.get<any[]>('assets/sepomex_gto.json').subscribe({
      next: (data) => {
        const resultados = data.filter(r => r.cp === cp);
        if (resultados.length > 0) {
          this.form.estado = resultados[0].estado;
          this.form.ciudad = resultados[0].ciudad || resultados[0].municipio;
          this.form.colonia = '';
          this.colonias = resultados.map(r => r.colonia);
        } else {
          this.mostrarModal('Código postal no encontrado');
          this.form.estado = '';
          this.form.ciudad = '';
          this.colonias = [];
        }
        this.buscandoCP = false;
      },
      error: () => {
        this.mostrarModal('Error al cargar los códigos postales');
        this.buscandoCP = false;
      }
    });
  }

  registrar() {
    // Validaciones campo a campo con mensajes claros
    if (!this.form.nombre_empresa || !this.form.nombre_empresa.trim()) {
      this.mostrarModal('El nombre de la empresa es obligatorio.');
      return;
    }
    if (!this.form.correo_electronico || !this.form.correo_electronico.trim()) {
      this.mostrarModal('El correo electrónico es obligatorio.');
      return;
    }
    if (!this.form.contrasena) {
      this.mostrarModal('La contraseña es obligatoria.');
      return;
    }
    if (!this.form.contrasena_verificar) {
      this.mostrarModal('Debes confirmar tu contraseña.');
      return;
    }
    if (this.form.contrasena !== this.form.contrasena_verificar) {
      this.mostrarModal('Las contraseñas no coinciden.');
      return;
    }
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;
    if (!passRegex.test(this.form.contrasena)) {
      this.mostrarModal('La contraseña debe tener al menos 6 caracteres: una minúscula, una mayúscula, un número y un símbolo.');
      return;
    }
    if (!this.form.telefono || !this.form.telefono.trim()) {
      this.mostrarModal('El teléfono es obligatorio.');
      return;
    }
    if (!this.form.descripcion || !this.form.descripcion.trim()) {
      this.mostrarModal('La descripción de la empresa es obligatoria.');
      return;
    }
    if (!this.form.rfc || !this.form.rfc.trim()) {
      this.mostrarModal('El RFC Moral es obligatorio.');
      return;
    }
    // Validar formato RFC Moral (12 caracteres: 3 letras + 6 dígitos + 3 alfanuméricos)
    const rfcMoralRegex = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/i;
    if (!rfcMoralRegex.test(this.form.rfc)) {
      this.mostrarModal('El formato del RFC Moral es inválido. Debe tener exactamente 12 caracteres (ej. SAT970701NN3).');
      return;
    }
    if (!this.form.codigo_postal) {
      this.mostrarModal('El código postal es obligatorio.');
      return;
    }
    if (!this.form.estado) {
      this.mostrarModal('El estado es obligatorio. Por favor ingresa un código postal válido.');
      return;
    }
    if (!this.form.ciudad) {
      this.mostrarModal('La ciudad es obligatoria.');
      return;
    }
    if (!this.form.colonia) {
      this.mostrarModal('La colonia es obligatoria.');
      return;
    }
    if (!this.form.calle || !this.form.calle.trim()) {
      this.mostrarModal('La calle es obligatoria.');
      return;
    }

       if (
      this.googleMaps.normalizar(this.form.estado) !==
      this.googleMaps.normalizar('Guanajuato')
    ) {
      this.mostrarModal(
        'La ubicación debe estar dentro del estado de Guanajuato.'
      );
      return;
    }


    this.erroresDuplicados = { correo_electronico: false, rfc: false, nombre_empresa: false };

    const { contrasena_verificar, ...datos } = this.form;

    this.api.registrarEmpleador(datos).subscribe({
      next: (res) => {
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
        sessionStorage.removeItem('usuario');
        sessionStorage.removeItem('token');

        const user = res.user || {
          id: res.id_empleador,
          nombre: res.nombre_empresa,
          correo: res.correo_electronico,
          rol: 'empleador'
        };

        localStorage.setItem('usuario', JSON.stringify(user));
        localStorage.setItem("token", res.token);

        localStorage.setItem('perfilEmpleador', JSON.stringify({
          id_empleador: res.id_empleador,
          nombre_empresa: this.form.nombre_empresa,
          correo_electronico: this.form.correo_electronico,
          pais: this.form.pais,
          estado: this.form.estado,
          ciudad: this.form.ciudad,
          colonia: this.form.colonia,
          calle: this.form.calle,
          codigo_postal: this.form.codigo_postal,
          telefono: this.form.telefono,
          rfc: this.form.rfc,
          descripcion: this.form.descripcion
        }));

        this.mostrarModalExito(`¡Tu empresa ya forma parte de ChamBee!`);
      },
      error: (err: any) => {
        console.error('Error:', err);
        let mensaje = err?.error?.error || 'Error al crear la cuenta. Intenta de nuevo.';

        if (err?.error?.duplicateField) {
          const field = err.error.duplicateField;
          if (field === 'rfc') {
            this.erroresDuplicados.rfc = true;
            mensaje = 'El RFC ingresado ya se encuentra registrado en una cuenta.';
          }
          if (field === 'correo_electronico') {
            this.erroresDuplicados.correo_electronico = true;
            mensaje = 'El correo electrónico ingresado ya se encuentra registrado en una cuenta.';
          }
          if (field === 'nombre_empresa') {
            this.erroresDuplicados.nombre_empresa = true;
            mensaje = 'El nombre de la empresa ya se encuentra registrado en una cuenta.';
          }
        }

        this.mostrarModal(mensaje);
      }
    });
  }

  
    ubicacionSeleccionada(direccion: DireccionCompleta) {
  
      if (
        this.googleMaps.normalizar(direccion.estado) !==
        this.googleMaps.normalizar('Guanajuato')
      ) {
  
        this.form.latitud = null;
        this.form.longitud = null;
  
        this.form.calle = '';
        this.form.numero_exterior = '';
        this.form.colonia = '';
        this.form.ciudad = '';
        this.form.estado = '';
        this.form.codigo_postal = '';
        this.form.direccion_formateada = '';
  
        this.colonias = [];
        this.ubicacionSeleccionadaFlag = false;
  
        this.mostrarModal(
          'Por el momento, Chambee solo permite registrar ubicaciones dentro del estado de Guanajuato.'
        );
  
        return;
      }
  
      this.form.calle = direccion.calle;
  
      this.form.numero_exterior = direccion.numero;
  
      this.form.ciudad = direccion.ciudad;
  
      this.form.estado = direccion.estado;
  
      this.form.codigo_postal = direccion.codigoPostal;
  
      this.form.direccion_formateada = direccion.direccionFormateada;
  
      this.form.latitud = direccion.latitud;
  
      this.form.longitud = direccion.longitud;
  
      if (direccion.colonia) {
        this.form.colonia = direccion.colonia;
        this.colonias = [];
      } else {
        this.form.colonia = '';
  
        this.buscarColoniasPorCP(
          direccion.codigoPostal
        );
      }
      this.ubicacionSeleccionadaFlag = true;
  
      console.log('Ubicación seleccionada:', direccion);
  
    }
  
    private buscarColoniasPorCP(cp: string) {
  
      if (!cp) {
        this.colonias = [];
        return;
      }
  
      const resultados = this.sepomex.filter(
        r => r.cp === cp
      );
  
      this.colonias = [
        ...new Set(
          resultados.map(r => r.colonia)
        )
      ];
  
      console.log('Colonias encontradas en SEPOMEX:', this.colonias);
    }
}
