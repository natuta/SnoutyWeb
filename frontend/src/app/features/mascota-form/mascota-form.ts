
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Mascota } from '../../shared/models/mascota';
import { Especie } from '../../shared/models/especie';
import { Raza } from '../../shared/models/raza';

@Component({
  selector: 'app-mascota-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mascota-form.html'
})
export default class MascotaForm {
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  id: number | null = null;
  model: Mascota = { nombre: '', sexo: 'M', especie: 0, raza: null, edad: 0, color: '' };
  especies: Especie[] = [];
  razas: Raza[] = [];
  title = 'Nueva mascota';

  ngOnInit(){
    this.api.listEspecies().subscribe(es => this.especies = es);
    this.loadRazas();
    const id = this.route.snapshot.paramMap.get('id');
    if(id){
      this.id = +id;
      this.title = 'Editar mascota';
      this.api.getMascota(this.id).subscribe(data => {
        this.model = data;
        this.onEspecieChange();
      });
    }
  }
  onEspecieChange(){
    // Filtra razas por especie seleccionada en el cliente
    this.api.listRazas().subscribe(rs => this.razas = rs.filter(r => r.especie === this.model.especie));
    if(this.model.raza){
      const ok = this.razas.some(r => r.id === this.model.raza);
      if(!ok) this.model.raza = null;
    }
  }
  loadRazas(){ this.api.listRazas().subscribe(rs => this.razas = rs); }
  save(){
    const payload = { ...this.model };
    const req = this.id ? this.api.updateMascota(this.id, payload) : this.api.createMascota(payload);
    req.subscribe({ next: _ => this.router.navigateByUrl('/mascotas') });
  }
}
