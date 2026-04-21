<?php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    public function toArray($request)
    {
        // Normalize permissions format
        $perms = $this->permissions ?? [];
        $permsOut = [];

        if (is_string($perms)) {
            if (trim($perms) === '*') {
                $permsOut = ['*'];
            } else {
                $permsOut = [$perms];
            }
        } elseif (is_array($perms)) {
            // If a collection of RolePermission items
            if (!empty($perms) && is_object($perms[0])) {
                // Laravel relationship could return Collection of RolePermission objects with 'permission'
                $first = $perms[0];
                if (property_exists($first, 'permission')) {
                    $permsOut = array_map(function($p){ return $p->permission; }, $perms);
                } else {
                    $permsOut = $perms;
                }
            } else {
                $permsOut = $perms;
            }
        }

        if (in_array('*', $permsOut, true)) {
            $permsOut = ['*'];
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'description' => $this->description,
            'color' => $this->color,
            'permissions' => $permsOut,
        ];
    }
}
