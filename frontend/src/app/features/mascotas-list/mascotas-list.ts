
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Mascota } from '../../shared/models/mascota';

@Component({
  selector: 'app-mascotas-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mascotas-list.html'
})
export default class MascotasList {
  api = inject(ApiService);
  data: Mascota[] = [];
  ngOnInit(){ this.load(); }
  load(){ this.api.listMascotas().subscribe(d => this.data = d); }
  remove(id?: number){
    if(!id) return;
    if(confirm('¿Eliminar mascota?')) this.api.deleteMascota(id).subscribe({next: _=> this.load()});
  }
}
